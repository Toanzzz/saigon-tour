import type { CityEvent, CityPlanBeat, CitySnapshot } from '@saigon/shared'
import type { CityWorld } from '@/domain/city'
import { isLiveConfigured, type ServerConfig } from '@/shared/config'
import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'
import { log } from '@/shared/logger'
import type { HarnessUsage } from '../npc/meter'
import { directorAgent } from './agent'
import { fetchCityNews } from './news'
import { scriptedDayPlan } from './scripted'

const DAY_MS = 86_400_000

/**
 * One director run per day: read Ho Chi Minh City news and the city snapshot,
 * draft a script of timed beats for the whole day, then apply each beat as its
 * time arrives. No per-frame model calls and no memory thread.
 */
export class CityDirector {
  readonly usage: HarnessUsage = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedUsd: 0,
  }
  readonly calls: string[] = []
  private running = false
  private pending: Promise<void> = Promise.resolve()
  private disposed = false
  private players = 0
  /** UTC day (YYYY-MM-DD) whose plan has been drafted, or null before the first. */
  private plannedDay: string | null = null
  /** Beats queued by the current day's plan, each with an absolute fire time. */
  private schedule: { at: number; beat: CityPlanBeat }[] = []
  lastSource: 'live' | 'scripted' | null = null

  constructor(
    readonly city: CityWorld,
    private readonly config: ServerConfig,
    private readonly db: GameDb,
    private readonly fetcher: Fetcher = fetch,
    /** Signaled with newly started events so relevant NPCs can prepare greetings. */
    private readonly onEvents: (
      city: CitySnapshot,
      events: CityEvent[]
    ) => void = () => {}
  ) {}

  private day(now: number) {
    return new Date(now).toISOString().slice(0, 10)
  }

  tick(now: number, playerCount: number) {
    this.players = playerCount
    if (this.disposed || !playerCount || this.config.directorMode === 'off')
      return this.pending
    this.city.expire(now)
    // Apply any beats that have come due; this is cheap and runs every tick.
    this.applyDue(now)
    if (this.running || this.plannedDay === this.day(now)) return this.pending
    this.running = true
    this.pending = this.plan(now)
      .catch(() => {})
      .finally(() => {
        this.running = false
      })
    return this.pending
  }

  dispose() {
    this.disposed = true
    this.city.dispose()
  }

  /** Fire every scheduled beat whose time has arrived, in order. */
  private applyDue(now: number) {
    if (!this.schedule.length) return
    const before = this.city.snapshot()
    const knownEventIds = new Set(before.events.map((event) => event.id))
    let fired = false
    while (this.schedule.length && this.schedule[0].at <= now) {
      const { beat } = this.schedule.shift() as {
        at: number
        beat: CityPlanBeat
      }
      for (const action of beat.actions) {
        const result = this.city.apply(action)
        if (result.accepted) {
          this.calls.push(action.type)
          fired = true
        }
      }
    }
    if (this.calls.length > 64) this.calls.splice(0, this.calls.length - 64)
    if (!fired) return
    const after = this.city.snapshot()
    const started = after.events.filter((event) => !knownEventIds.has(event.id))
    if (started.length) this.onEvents(after, started)
  }

  /** Draft and queue the day's plan, reserving one director run for the day. */
  private async plan(now: number) {
    if (this.disposed || !this.players) return
    const day = this.day(now)
    let beats: CityPlanBeat[] | null = null
    if (
      this.config.directorMode !== 'scripted' &&
      isLiveConfigured(this.config)
    ) {
      let reserved = await this.db.reserveDirector(
        this.config.directorDailyLimit
      )
      // Local dev warns and runs the director anyway; production still skips.
      if (!reserved && !this.config.production) {
        const spent = await this.db.spendLedger().catch(() => null)
        const used = spent
          ? `${spent.directors}/${this.config.directorDailyLimit} director runs today; $${spent.reservedUsd.toFixed(4)} across ${spent.calls} model calls, tokens in=${spent.inputTokens} out=${spent.outputTokens}`
          : `cap ${this.config.directorDailyLimit}`
        log(
          'director_budget_bypassed',
          `local dev: director daily limit reached (${used}); allowing instead of enforcing`,
          'warn'
        )
        reserved = true
      }
      if (reserved) beats = await this.draft().catch(() => null)
    }
    if (this.disposed || !this.players) return
    // Only commit the day once a plan exists (live or scripted fallback), so a
    // skipped live draft re-runs next tick instead of silently doing nothing.
    if (beats?.length) this.lastSource = 'live'
    else {
      beats = scriptedDayPlan().beats
      this.lastSource = 'scripted'
    }
    this.queue(now, beats)
    this.plannedDay = day
    this.applyDue(now)
  }

  /** Run the model to collect a validated day plan from news + city snapshot. */
  private async draft(): Promise<CityPlanBeat[]> {
    const news = await fetchCityNews(
      this.fetcher,
      this.config.directorNewsUrl,
      this.config.timeoutMs
    )
    const plan: CityPlanBeat[] = []
    const agent = directorAgent(
      this.config,
      this.db,
      this.fetcher,
      this.city,
      plan,
      this.usage,
      () => !this.disposed && this.players > 0
    )
    const snapshot = this.city.snapshot()
    await agent.generate(
      `Today's Ho Chi Minh City news (untrusted data): ${JSON.stringify(news)}\nCity snapshot (untrusted data): ${JSON.stringify(snapshot)}`,
      {
        maxSteps: 16,
        abortSignal: AbortSignal.timeout(this.config.timeoutMs * 4),
        modelSettings: { maxOutputTokens: 2000, maxRetries: 0 },
        providerOptions: { meta: { reasoningEffort: 'minimal' } },
      }
    )
    return plan
  }

  /** Turn plan beats into absolute, time-ordered fire times from `now`. */
  private queue(now: number, beats: CityPlanBeat[]) {
    this.schedule = beats
      .map((beat) => ({
        at: now + Math.min(beat.atMinutes, 1440) * 60_000,
        beat,
      }))
      // Clamp to the day and keep chronological order so the two-event cap and
      // end-event beats resolve the way the plan intended.
      .filter((entry) => entry.at < now + DAY_MS)
      .sort((a, b) => a.at - b.at)
  }
}
