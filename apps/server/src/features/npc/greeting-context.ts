import {
  type CitySnapshot,
  type Locale,
  type NeighborId,
  NPCS,
  type NpcId,
  type TimeOfDay,
} from '@saigon/shared'

export interface GreetingContext {
  level: number
  timeOfDay: TimeOfDay
  weather: CitySnapshot['weather']
  events: CitySnapshot['events']
  need: string | null
}

export function greetingContext(
  npc: NpcId,
  level: number,
  timeOfDay: TimeOfDay,
  city: CitySnapshot | null | undefined
): GreetingContext {
  return {
    level,
    timeOfDay,
    weather: city?.weather ?? 'clear',
    events: [...(city?.events ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
    need:
      NPCS[npc].kind === 'neighbor'
        ? (city?.needs[npc as NeighborId] ?? null)
        : null,
  }
}

export function greetingSignature(context: GreetingContext) {
  return JSON.stringify({
    level: context.level,
    timeOfDay: context.timeOfDay,
    weather: context.weather,
    events: context.events.map(({ id, kind, locationId, title }) => ({
      id,
      kind,
      locationId,
      title,
    })),
    need: context.need,
  })
}

export function greetingPrompt(context: GreetingContext) {
  const events = context.events.length
    ? context.events
        .map(
          (event) =>
            `${event.title} at ${event.locationId}: ${event.description}`
        )
        .join('; ')
    : 'none'
  return `It is ${context.timeOfDay}. Weather: ${context.weather}. Active city events: ${events}. Your current need: ${context.need ?? 'none'}. Friendliness toward this visitor is ${context.level} on a -5 to +5 scale. Greet this visitor in one or two short sentences. Match the friendliness exactly: hostile at -5, guarded below 0, neutral at 0, warm above 0, very close at +5. Mention the weather or an active event only when it fits naturally. Do not offer or claim to start an errand.`
}

const TIME_VI: Record<TimeOfDay, string> = {
  morning: 'buổi sáng',
  afternoon: 'buổi chiều',
  evening: 'buổi tối',
  night: 'buổi đêm',
}

export function fallbackGreeting(
  npc: NpcId,
  context: GreetingContext,
  locale: Locale
) {
  const event = context.events[0]
  if (locale === 'vi') {
    const tone =
      context.level <= -3
        ? 'Chào bạn.'
        : context.level < 0
          ? 'À, chào bạn.'
          : context.level >= 3
            ? 'Chào bạn thân!'
            : 'Chào bạn!'
    const weather =
      context.weather === 'rain'
        ? ` Trời đang mưa ${TIME_VI[context.timeOfDay]}.`
        : ` Một ${TIME_VI[context.timeOfDay]} dễ chịu.`
    return `${tone}${weather}${event ? ` ${event.title} đang diễn ra.` : ''}`
  }
  const tone =
    context.level <= -3
      ? 'Hello.'
      : context.level < 0
        ? 'Oh, hello.'
        : context.level >= 3
          ? 'There you are, friend!'
          : 'Hello!'
  const weather =
    context.weather === 'rain'
      ? ` A rainy ${context.timeOfDay} in Sài Gòn.`
      : ` A lovely ${context.timeOfDay} in Sài Gòn.`
  return `${tone}${weather}${event ? ` ${event.title} is happening.` : ` ${NPCS[npc].knowledge[0] ?? ''}`}`.trim()
}
