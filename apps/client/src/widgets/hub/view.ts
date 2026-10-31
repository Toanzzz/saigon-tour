import {
  DEMO_QUEST,
  type LocationId,
  NPCS,
  type NpcId,
  SECRET_QUESTS,
} from '@saigon/shared'
import type { GameState } from '@/shared/state/game'
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
  const objective = state.quest?.objective
  if (!objective) return null
  if (objective.type === 'GO_TO') return objective.locationId
  if (objective.type === 'TALK_TO') return NPCS[objective.npcId].location
  if (objective.type === 'DELIVER') {
    const delivered = state.world.deliveredItems.includes(
      `${objective.itemId}:${objective.npcId}`
    )
    const target = delivered
      ? (state.quest?.giverNpcId ?? objective.npcId)
      : objective.npcId
    return NPCS[target].location
  }
  return null
}

function storySteps(state: GameState): HubStep[] {
  const target = objectiveLocation(state) ?? state.world.locationId
  const allVisited = CITY_TRAIL.every((stop) =>
    state.world.visitedLocations.includes(stop.location)
  )
  return CITY_TRAIL.map((stop) => ({
    title: stop.title,
    detail: stop.detail,
    state:
      stop.location === target && state.quest
        ? 'now'
        : allVisited
          ? 'done'
          : !state.quest && stop.location === state.world.locationId
            ? 'now'
            : state.world.visitedLocations.includes(stop.location)
              ? 'done'
              : 'next',
  }))
}

function secretSteps(state: GameState) {
  return Object.values(SECRET_QUESTS).map((quest) => {
    const completed = state.world.completedQuestIds.includes(quest.id)
    const active = state.quest?.id === quest.id
    return {
      id: quest.id,
      title: quest.title,
      detail: completed
        ? 'Completed'
        : active
          ? `Active · ${NPCS[quest.giverNpcId].name}`
          : `Ask ${NPCS[quest.giverNpcId].name} for the secret`,
      state: completed ? 'done' : active ? 'now' : 'next',
    } satisfies HubSecret
  })
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
  const demoComplete = state.world.completedQuestIds.includes(DEMO_QUEST.id)
  const done =
    demoComplete &&
    steps.every((step) => step.state === 'done') &&
    state.quest === null
  const secrets = secretSteps(state)
  const last = state.world.talkedTo.at(-1)
  const ids = Object.keys(PLACES) as LocationId[]
  const current = steps.find((step) => step.state === 'now')
  const active = state.quest
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
      title:
        state.quest?.title ??
        (state.world.completedQuestIds.includes(DEMO_QUEST.id)
          ? 'A walk through Sài Gòn'
          : DEMO_QUEST.title),
      steps,
      secrets,
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
