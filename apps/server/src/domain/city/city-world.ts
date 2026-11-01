import { randomUUID } from 'node:crypto'
import {
  CITY_ANCHORS,
  type CityAction,
  CityActionSchema,
  type CityHeadline,
  type CitySnapshot,
  initialCitySnapshot,
  type NeighborId,
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
    if (remaining.length === this.state.events.length) return
    this.state.events = remaining
    this.state.revision += 1
    this.changed()
  }

  apply(input: unknown): CityActionResult {
    if (this.disposed) return { accepted: false, reason: 'room_disposed' }
    const parsed = CityActionSchema.safeParse(input)
    if (!parsed.success)
      return {
        accepted: false,
        reason: `invalid_action:${parsed.error.issues[0]?.message}`,
      }
    const action: CityAction = parsed.data
    this.expire()
    if (action.type === 'start-event') {
      if (this.state.events.length >= 2)
        return { accepted: false, reason: 'active_event_cap:2' }
      if (!safeLine(action.title) || !safeLine(action.description))
        return { accepted: false, reason: 'unsafe_event_text' }
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
      if (!this.state.events.some((event) => event.id === action.eventId))
        return { accepted: false, reason: 'event_not_found' }
      this.state.events = this.state.events.filter(
        (event) => event.id !== action.eventId
      )
    } else if (action.type === 'move-npc') {
      if (!Object.hasOwn(CITY_ANCHORS[action.locationId], action.anchorId))
        return { accepted: false, reason: 'unknown_authored_anchor' }
      const position = CITY_ANCHORS[action.locationId][action.anchorId]
      if (!position)
        return { accepted: false, reason: 'unknown_authored_anchor' }
      this.state.npcPlacements[action.npcId] = {
        locationId: action.locationId,
        anchorId: action.anchorId,
        position: [...position],
      }
    } else if (action.type === 'set-npc-need') {
      if (action.need && !safeLine(action.need))
        return { accepted: false, reason: 'unsafe_need' }
      if (action.need) this.state.needs[action.npcId] = action.need
      else delete this.state.needs[action.npcId]
    } else if (action.type === 'post-headline') {
      if (!safeLine(action.text))
        return { accepted: false, reason: 'unsafe_headline' }
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
