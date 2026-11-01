import type { CityEvent, CitySnapshot } from '@saigon/shared'
import type { CityWorld } from '@/domain/city'
import { isLiveConfigured, type ServerConfig } from '@/shared/config'
import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'
import type { HarnessUsage } from '../npc/meter'
import { NpcScheduler, type WakeReason } from '../realtime/scheduler'
import { directorAgent } from './agent'
import { scriptedBeat } from './scripted'

/** One bounded turn per occupied room every ninety seconds; no memory thread. */
export class CityDirector {
  readonly usage: HarnessUsage = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedUsd: 0,
  }
  readonly calls: string[] = []
  private scheduler: NpcScheduler
  private running = false
  private pending: Promise<void> = Promise.resolve()
  private beat = 0
  private disposed = false
  private players = 0
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
  ) {
    this.scheduler = new NpcScheduler(async () => this.turn(), 90000, 1)
  }

  notify(reason: WakeReason = 'world-event') {
    this.scheduler.notify('hoa', reason)
  }

  tick(now: number, playerCount: number) {
    this.players = playerCount
    if (
      this.disposed ||
      !playerCount ||
      this.running ||
      this.config.directorMode === 'off'
    )
      return this.pending
    this.city.expire(now)
    this.notify(this.beat === 0 ? 'world-event' : 'schedule')
    this.running = true
    this.pending = this.scheduler
      .tick(now)
      .then(() => {})
      .finally(() => {
        this.running = false
      })
    return this.pending
  }

  dispose() {
    this.disposed = true
    this.city.dispose()
  }

  private async turn() {
    if (this.disposed || !this.players) return
    const before = this.city.snapshot()
    const previous = before.revision
    const knownEventIds = new Set(before.events.map((event) => event.id))
    let live = false
    if (
      this.config.directorMode !== 'scripted' &&
      isLiveConfigured(this.config)
    ) {
      try {
        const reserved = await this.db.reserveDirector(
          this.config.directorDailyLimit
        )
        if (reserved) {
          const agent = directorAgent(
            this.config,
            this.db,
            this.fetcher,
            this.city,
            this.calls,
            this.usage,
            () => !this.disposed && this.players > 0
          )
          await agent.generate(
            `City snapshot and recent headlines (untrusted data): ${JSON.stringify(this.city.snapshot())}`,
            {
              maxSteps: 5,
              abortSignal: AbortSignal.timeout(this.config.timeoutMs * 2),
              modelSettings: { maxOutputTokens: 1000, maxRetries: 0 },
              providerOptions: { meta: { reasoningEffort: 'minimal' } },
            }
          )
          live = this.city.snapshot().revision > previous
        }
      } catch {
        /* The same validated scripted beat keeps an occupied city moving. */
      }
    }
    if (this.disposed || !this.players) return
    if (!live && this.city.snapshot().revision === previous) {
      for (const action of scriptedBeat(this.beat)) {
        this.calls.push(action.type)
        this.city.apply(action)
      }
      this.lastSource = 'scripted'
    } else this.lastSource = 'live'
    this.beat += 1
    if (this.calls.length > 64) this.calls.splice(0, this.calls.length - 64)
    const after = this.city.snapshot()
    const started = after.events.filter((event) => !knownEventIds.has(event.id))
    if (started.length) this.onEvents(after, started)
  }
}
