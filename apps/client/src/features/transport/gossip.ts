import {
  type CityEvent,
  isRevealed,
  type LocationId,
  type Quest,
  stepText,
  type TravelMode,
} from '@saigon/shared'
import { getLocale, m } from '@/shared/i18n'
import { placeName } from '@/shared/world/places'

export interface GossipInput {
  mode: TravelMode
  destination: LocationId
  event: CityEvent | null
  quest: Quest | null
  now: number
}

/** A stable hash so the same inputs always pick the same base line. */
function hash(parts: string[]): number {
  let h = 2166136261
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      h ^= part.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
  }
  return h >>> 0
}

/** The reveal line for a cyclo ride when the tracked quest hides a riddle. */
function cycloReveal(input: GossipInput): string | null {
  const quest = input.quest
  if (!quest?.riddle || isRevealed(quest, input.now)) return null
  const first = quest.steps[0]
  if (!first) return null
  return m.ride_reveal_cyclo({ answer: stepText(first, getLocale()) })
}

/**
 * Deterministic ride subtitles for the seated driver. The cyclo is talkative
 * (2–3 lines); every other mode shows one line. When the tracked quest hides a
 * riddle, the cyclo's last line reveals the answer.
 */
export function gossipLines(input: GossipInput): string[] {
  const { mode, destination, event, quest } = input
  const seed = hash([
    mode,
    destination,
    event?.id ?? 'none',
    quest?.id ?? 'none',
  ])
  if (mode !== 'cyclo') {
    const single: Record<Exclude<TravelMode, 'cyclo'>, string> = {
      xeom: m.ride_line_xeom(),
      bus: m.ride_line_bus(),
      metro: m.ride_line_metro(),
    }
    return [single[mode]]
  }
  // Cyclo: an opener, a context line, then either the reveal or a closer.
  const openers = [
    m.ride_line_cyclo_1(),
    m.ride_line_cyclo_2(),
    m.ride_line_cyclo_3(),
  ]
  const opener = openers[seed % openers.length] ?? openers[0]
  const context = event
    ? m.ride_gossip_event({ place: placeName(event.locationId) })
    : quest
      ? m.ride_gossip_quest()
      : m.ride_gossip_dest({ place: placeName(destination) })
  const reveal = cycloReveal(input)
  const last = reveal ?? m.ride_gossip_dest({ place: placeName(destination) })
  // Avoid repeating the destination line back to back when there is no event.
  if (!event && !quest && !reveal) return [opener, context]
  return [opener, context, last]
}
