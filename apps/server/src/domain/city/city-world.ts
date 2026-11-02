import { randomUUID } from 'node:crypto'
import {
  CITY_ANCHORS,
  type CityAction,
  CityActionSchema,
  type CityHeadline,
  type CitySnapshot,
  initialCitySnapshot,
  type NeighborId,
  NPC_ACTIVITIES,
} from '@saigon/shared'
import { safeLine } from '@/features/npc/safety'

export type CityActionResult =
  | { accepted: true; revision: number }
  | { accepted: false; reason: string }

/** A room owns one city; only validated actions can change it. */
export class CityWorld {
  private state: CitySnapshot = initialCitySnapshot()
  private disposed = false
  constructor(
    private readonly now = Date.now,
    private readonly publishHeadline: (
      headline: CityHeadline
    ) => void = () => {},
    private readonly changed: () => void = () => {}
  ) {}

  position(npcId: NeighborId): readonly [number, number, number] {
    return this.state.npcPlacements[npcId].position
  }

  snapshot(): CitySnapshot {
    return structuredClone(this.state)
  }
  dispose() {
    this.disposed = true
  }

  expire(now = this.now()) {
    if (this.disposed) return
    const remaining = this.state.events.filter((event) => event.endsAt > now)
    const activities = Object.entries(this.state.npcActivities).filter(
      ([, activity]) => activity && activity.endsAt > now
    )
    if (
      remaining.length === this.state.events.length &&
      activities.length === Object.keys(this.state.npcActivities).length
    )
      return
    this.state.events = remaining
    this.state.npcActivities = Object.fromEntries(activities)
    this.state.revision += 1
    this.changed()
  }

  /** Parse and run the deterministic rules for one action without mutating. */
  private check(
    input: unknown,
    pendingEvents: number
  ): { action: CityAction } | { reason: string } {
    const parsed = CityActionSchema.safeParse(input)
    if (!parsed.success)
      return { reason: `invalid_action:${parsed.error.issues[0]?.message}` }
    const action = parsed.data
    if (action.type === 'set-npc-activity') {
      if (!Object.hasOwn(NPC_ACTIVITIES[action.npcId], action.activityId))
        return { reason: 'unknown_npc_activity' }
    } else if (action.type === 'start-event') {
      if (pendingEvents >= 2) return { reason: 'active_event_cap:2' }
      if (!safeLine(action.title) || !safeLine(action.description))
        return { reason: 'unsafe_event_text' }
    } else if (action.type === 'end-event') {
      if (!this.state.events.some((event) => event.id === action.eventId))
        return { reason: 'event_not_found' }
    } else if (action.type === 'move-npc') {
      const anchors = CITY_ANCHORS[action.locationId]
      if (!Object.hasOwn(anchors, action.anchorId) || !anchors[action.anchorId])
        return { reason: 'unknown_authored_anchor' }
    } else if (action.type === 'set-npc-need') {
      if (action.need && !safeLine(action.need))
        return { reason: 'unsafe_need' }
    } else if (action.type === 'post-headline') {
      if (!safeLine(action.text)) return { reason: 'unsafe_headline' }
    }
    return { action }
  }

  /**
   * Dry-run a batch of actions in sequence (as a day-plan beat would apply),
   * returning the first rejection without mutating the city. Event-cap checks
   * account for events this beat would start.
   */
  validate(actions: readonly unknown[]): CityActionResult {
    if (this.disposed) return { accepted: false, reason: 'room_disposed' }
    const now = this.now()
    let pendingEvents = this.state.events.filter(
      (event) => event.endsAt > now
    ).length
    for (const input of actions) {
      const result = this.check(input, pendingEvents)
      if ('reason' in result) return { accepted: false, reason: result.reason }
      if (result.action.type === 'start-event') pendingEvents += 1
      else if (result.action.type === 'end-event') pendingEvents -= 1
    }
    return { accepted: true, revision: this.state.revision }
  }

  apply(input: unknown): CityActionResult {
    if (this.disposed) return { accepted: false, reason: 'room_disposed' }
    this.expire()
    const result = this.check(input, this.state.events.length)
    if ('reason' in result) return { accepted: false, reason: result.reason }
    const action = result.action
    if (action.type === 'set-npc-activity') {
      const now = this.now()
      this.state.npcActivities[action.npcId] = {
        activityId: action.activityId,
        startedAt: now,
        endsAt: now + action.durationMs,
      }
    } else if (action.type === 'start-event') {
      const now = this.now()
      this.state.events.push({
        id: `event_${randomUUID()}`,
        kind: action.kind,
        locationId: action.locationId,
        title: action.title,
        description: action.description,
        startedAt: now,
        endsAt: now + action.durationMs,
      })
    } else if (action.type === 'end-event') {
      this.state.events = this.state.events.filter(
        (event) => event.id !== action.eventId
      )
    } else if (action.type === 'move-npc') {
      const position = CITY_ANCHORS[action.locationId][action.anchorId]
      this.state.npcPlacements[action.npcId] = {
        locationId: action.locationId,
        anchorId: action.anchorId,
        position: [...(position as readonly [number, number, number])],
      }
    } else if (action.type === 'set-npc-need') {
      if (action.need) this.state.needs[action.npcId] = action.need
      else delete this.state.needs[action.npcId]
    } else if (action.type === 'post-headline') {
      const headline = {
        id: `headline_${randomUUID()}`,
        text: action.text.replace(/\s+/g, ' ').trim(),
        createdAt: this.now(),
      }
      this.state.headlines = [...this.state.headlines, headline].slice(-12)
      this.publishHeadline(headline)
    } else this.state.weather = action.weather
    this.state.revision += 1
    this.changed()
    return { accepted: true, revision: this.state.revision }
  }
}
