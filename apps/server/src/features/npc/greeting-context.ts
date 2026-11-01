import {
  type CityEvent,
  type CitySnapshot,
  hostingEvent,
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
  hosting: CityEvent | null
  /** This player's errand status with the NPC, so the opener can acknowledge it. */
  errand: 'active' | 'ready' | null
}

export function greetingContext(
  npc: NpcId,
  level: number,
  timeOfDay: TimeOfDay,
  city: CitySnapshot | null | undefined,
  errand: 'active' | 'ready' | null = null
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
    hosting: hostingEvent(city, npc),
    errand,
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
    hosting: context.hosting?.id ?? null,
    errand: context.errand,
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
  return `It is ${context.timeOfDay}. Weather: ${context.weather}. Active city events: ${events}. Your current need: ${context.need ?? 'none'}. Friendliness toward this visitor is ${context.level} on a -5 to +5 scale. Greet this visitor in one or two short sentences. Match the friendliness exactly: hostile at -5, guarded below 0, neutral at 0, warm above 0, very close at +5. ${context.errand === 'active' ? ' This visitor is already helping you with an errand; greet them warmly, thank them for taking it on, and gently encourage them to finish it. Do not offer a new errand.' : context.errand === 'ready' ? ' This visitor has finished what you asked; greet them warmly and welcome them back to settle up. Do not offer a new errand.' : context.hosting ? ` You are busy hosting ${context.hosting.title} right here (${context.hosting.description}); greet warmly but make clear you are caught up in it and could use a hand, without starting an errand yet.` : ' Usually greet without mentioning the weather or events; bring one up only when it clearly fits this visitor and moment.'} Do not offer or claim to start an errand.`
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
  const event = context.hosting ?? context.events[0]
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
    const tail =
      context.errand === 'active'
        ? ' Cảm ơn bạn đã nhận giúp nha, xong thì quay lại gặp mình.'
        : context.errand === 'ready'
          ? ' Bạn xong việc rồi hả? Ghé lại để mình cảm ơn nhé.'
          : context.hosting
            ? ` Mình đang bận lo ${context.hosting.title}, ghé phụ một tay nhé.`
            : event
              ? ` ${event.title} đang diễn ra.`
              : ''
    return `${tone}${weather}${tail}`
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
  const tail =
    context.errand === 'active'
      ? ' Thank you for taking this on — come back when it is done.'
      : context.errand === 'ready'
        ? ' You are back — let us settle up when you are ready.'
        : context.hosting
          ? ` I'm caught up hosting ${context.hosting.title} right now, but I could use a hand.`
          : event
            ? ` ${event.title} is happening.`
            : ` ${NPCS[npc].knowledge[0] ?? ''}`
  return `${tone}${weather}${tail}`.trim()
}
