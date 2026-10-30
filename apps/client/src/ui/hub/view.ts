import { DEMO_QUEST, type LocationId, NPCS, type NpcId } from '@saigon/shared'
import { MODES, PLACES, type TravelMode } from '../../core/places'
import type { GameState } from '../../state/game'

export type StepState = 'done' | 'now' | 'next'
export interface HubStep {
  title: string
  detail: string
  state: StepState
}
export interface HubRide {
  mode: TravelMode
  name: string
  fare: number
  from: LocationId
  to: LocationId
}
export interface HubView {
  coins: number
  greeting: string
  lede: string
  story: { title: string; steps: HubStep[]; coins: number; done: boolean }
  neighbor: {
    id: NpcId
    name: string
    role: string
    line: string
    source: 'live' | 'fallback' | null
  } | null
  ride: HubRide | null
  places: { id: LocationId; label: string; visited: boolean; here: boolean }[]
  discovered: number
  total: number
  muted: boolean
  volume: number
}

export function greetingFor(date: Date) {
  const hour = date.getHours()
  if (hour < 11) return 'Chào buổi sáng!'
  if (hour < 14) return 'Chào buổi trưa!'
  if (hour < 18) return 'Chào buổi chiều!'
  return 'Chào buổi tối!'
}

function storySteps(state: GameState): HubStep[] {
  const quest = state.quest
  const complete = state.world.completedQuestIds.includes(DEMO_QUEST.id)
  const delivered = state.world.deliveredItems.includes('herbs:linh')
  const step = complete ? 4 : !quest ? 1 : !delivered ? 2 : 3
  const at = (index: number): StepState =>
    index < step ? 'done' : index === step ? 'now' : 'next'
  return [
    { title: 'Meet Cô Hoa', detail: 'Market stall', state: at(1) },
    {
      title: 'Deliver the herbs',
      detail: 'Chị Linh, in the park',
      state: at(2),
    },
    { title: 'Tell Cô Hoa', detail: 'Earn a postcard', state: at(3) },
  ]
}

/** Next useful destination: the quest target first, then somewhere new. */
function nextStop(state: GameState): LocationId | null {
  const from = state.stop
  const delivered = state.world.deliveredItems.includes('herbs:linh')
  if (state.quest && !delivered && from !== 'park') return 'park'
  if (state.quest && delivered && from !== 'market') return 'market'
  const ids = Object.keys(PLACES) as LocationId[]
  return (
    ids.find(
      (id) => id !== from && !state.world.visitedLocations.includes(id)
    ) ??
    ids.find((id) => id !== from) ??
    null
  )
}

export function cheapestRide(state: GameState): HubRide | null {
  const to = nextStop(state)
  if (!to) return null
  const [mode] = (Object.keys(MODES) as TravelMode[])
    .filter((id) => MODES[id].fare <= state.world.currency)
    .sort((a, b) => MODES[a].fare - MODES[b].fare)
  if (!mode) return null
  return {
    mode,
    name: MODES[mode].name,
    fare: MODES[mode].fare,
    from: state.stop,
    to,
  }
}

export function hubView(state: GameState, now = new Date()): HubView {
  const steps = storySteps(state)
  const done = steps.every((step) => step.state === 'done')
  const last = state.world.talkedTo.at(-1)
  const ids = Object.keys(PLACES) as LocationId[]
  const current = steps.find((step) => step.state === 'now')
  return {
    coins: state.world.currency,
    greeting: greetingFor(now),
    lede: done
      ? 'The herbs made it to lunch. The whole city is yours to wander.'
      : current
        ? `Next: ${current.title.toLowerCase()}. ${current.detail}.`
        : '',
    story: {
      title: state.quest?.title ?? DEMO_QUEST.title,
      steps,
      coins: state.quest?.reward.currency ?? DEMO_QUEST.reward.currency,
      done,
    },
    neighbor: last
      ? {
          id: last,
          name: NPCS[last].name,
          role: NPCS[last].role,
          line: state.lastLine[last] ?? NPCS[last].knowledge[0],
          source: state.source,
        }
      : null,
    ride: cheapestRide(state),
    places: ids.map((id) => ({
      id,
      label: PLACES[id].name,
      visited: state.world.visitedLocations.includes(id),
      here: state.world.locationId === id,
    })),
    discovered: ids.filter((id) => state.world.visitedLocations.includes(id))
      .length,
    total: ids.length,
    muted: state.muted,
    volume: state.volume,
  }
}
