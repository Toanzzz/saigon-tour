import { type LocationId, NPCS, type NpcId } from '@saigon/shared'
import { city } from '@/shared/api/city'
import { type GameState, trackedQuest } from '@/shared/state/game'
import { nextStep, stepCopy } from '@/shared/state/quests'
import { MODES, PLACES, type TravelMode } from '@/shared/world/places'

export type StepState = 'done' | 'now' | 'next'
export interface HubStep {
  title: string
  detail: string
  state: StepState
}
export interface HubSecret {
  id: string
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
  story: {
    title: string
    steps: HubStep[]
    secrets: HubSecret[]
    coins: number
    done: boolean
  }
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

const CITY_TRAIL: {
  location: LocationId
  title: string
  detail: string
}[] = [
  {
    location: 'market',
    title: 'Bến Thành Market',
    detail: 'Meet Cô Hoa over a bowl of phở',
  },
  {
    location: 'park',
    title: 'Neighborhood park',
    detail: 'Carry lunch to Chị Linh under the trees',
  },
  {
    location: 'cityhall',
    title: 'City Hall',
    detail: 'Follow Vy’s lanterns along Nguyễn Huệ',
  },
  {
    location: 'opera',
    title: 'Opera House',
    detail: 'Hear Thảo practice a note that travels',
  },
  {
    location: 'cathedral',
    title: 'Nhà thờ Đức Bà',
    detail: 'Let the melody find its echo at Công xã Paris',
  },
  {
    location: 'postoffice',
    title: 'Central Post Office',
    detail: 'Trade a story with Sơn beside the old letters',
  },
  {
    location: 'alley',
    title: 'Food alley',
    detail: 'Find a lantern between the food stalls',
  },
  {
    location: 'river',
    title: 'Sài Gòn riverside',
    detail: 'Give Sơn a wide horizon for his postcards',
  },
]

function objectiveLocation(state: GameState): LocationId | null {
  const quest = trackedQuest(state)
  if (!quest) return null
  const step = nextStep(quest)
  if (!step) return city.state.npcPlacements[quest.giverNpcId].locationId
  if (step.type === 'GO_TO') return step.locationId
  if (step.type === 'BUY') return 'market'
  return city.state.npcPlacements[step.npcId].locationId
}
function storySteps(state: GameState): HubStep[] {
  const quest = trackedQuest(state)
  if (quest)
    return [
      ...quest.steps.map((step, index) => ({
        title: stepCopy(step),
        detail: quest.progress[index]
          ? 'Completed'
          : 'Your next small kindness',
        state: quest.progress[index]
          ? ('done' as const)
          : index === quest.progress.findIndex((done) => !done)
            ? ('now' as const)
            : ('next' as const),
      })),
      {
        title: `Return to ${NPCS[quest.giverNpcId].name}`,
        detail: 'Collect your thank-you',
        state: quest.status === 'ready' ? 'now' : 'next',
      },
    ]
  return CITY_TRAIL.map((stop) => ({
    title: stop.title,
    detail: stop.detail,
    state: state.world.visitedLocations.includes(stop.location)
      ? 'done'
      : 'next',
  }))
}
function secretSteps(state: GameState): HubSecret[] {
  return [
    ...state.quests.map((quest) => ({
      id: quest.id,
      title: quest.title,
      detail: `${NPCS[quest.giverNpcId].name} · ${quest.status}`,
      state: 'now' as const,
    })),
    ...state.completed.map((quest) => ({
      id: quest.id,
      title: quest.title,
      detail: 'Completed',
      state: 'done' as const,
    })),
  ]
}

/** Next useful destination: the quest target first, then somewhere new. */
function nextStop(state: GameState): LocationId | null {
  const from = state.stop
  const target = objectiveLocation(state)
  if (target && from !== target) return target
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
  const done = state.completed.length > 0 && state.quests.length === 0
  const secrets = secretSteps(state)
  const last = state.world.talkedTo.at(-1)
  const ids = Object.keys(PLACES) as LocationId[]
  const current = steps.find((step) => step.state === 'now')
  const active = trackedQuest(state)
  return {
    coins: state.world.currency,
    greeting: greetingFor(now),
    lede: active
      ? `${active.title}: ${active.description}`
      : done
        ? 'The whole city is yours to wander. Look for a neighbor with a secret.'
        : current
          ? `Next: ${current.title.toLowerCase()}. ${current.detail}.`
          : '',
    story: {
      title: active?.title ?? 'A walk through Sài Gòn',
      steps,
      secrets,
      coins: active?.reward.currency ?? 0,
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
