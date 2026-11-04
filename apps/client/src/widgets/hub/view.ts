import { type MilestoneBoard, milestoneBoard } from './milestone-view'

export {
  type MilestoneBoard,
  type MilestoneComponentView,
  milestoneBoard,
} from './milestone-view'

import {
  isRevealed,
  type LocationId,
  merchantFor,
  NPCS,
  type NpcId,
  type Quest,
} from '@saigon/shared'
import { city } from '@/shared/api/city'
import { m, npcDisplay, npcLabel } from '@/shared/i18n'
import { type GameState, trackedQuest } from '@/shared/state/game'
import { nextStep, stepLine } from '@/shared/state/quests'
import { clock } from '@/shared/state/ui'
import {
  distance,
  MODES,
  modeName,
  PLACES,
  placeName,
  type TravelMode,
} from '@/shared/world/places'

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
  milestone: MilestoneBoard
}

export function greetingFor(date: Date) {
  const hour = date.getHours()
  if (hour < 11) return m.greeting_morning()
  if (hour < 14) return m.greeting_noon()
  if (hour < 18) return m.greeting_afternoon()
  return m.greeting_evening()
}

/** The suggested first walk; built per call so it follows the language. */
function cityTrail(): {
  location: LocationId
  title: string
  detail: string
}[] {
  return [
    {
      location: 'market',
      title: placeName('market'),
      detail: m.trail_market(),
    },
    { location: 'park', title: m.trail_park_title(), detail: m.trail_park() },
    {
      location: 'cityhall',
      title: m.trail_cityhall_title(),
      detail: m.trail_cityhall(),
    },
    {
      location: 'opera',
      title: m.trail_opera_title(),
      detail: m.trail_opera(),
    },
    {
      location: 'cathedral',
      title: placeName('cathedral'),
      detail: m.trail_cathedral(),
    },
    {
      location: 'postoffice',
      title: placeName('postoffice'),
      detail: m.trail_postoffice(),
    },
    {
      location: 'alley',
      title: m.trail_alley_title(),
      detail: m.trail_alley(),
    },
    { location: 'river', title: placeName('river'), detail: m.trail_river() },
  ]
}

function objectiveLocation(state: GameState): LocationId | null {
  const quest = trackedQuest(state)
  if (!quest) return null
  // A hidden riddle has no known destination; do not suggest a ride to it.
  if (quest.riddle && !isRevealed(quest, clock.state.now)) return null
  const step = nextStep(quest)
  if (!step)
    return (
      city.state.npcPlacements[
        quest.giverNpcId as import('@saigon/shared').NeighborId
      ]?.locationId ?? NPCS[quest.giverNpcId].location
    )
  if (step.type === 'GO_TO') return step.locationId
  if (step.type === 'BUY') {
    const merchant = merchantFor(step.marketItemId)
    return (
      city.state.npcPlacements[merchant as import('@saigon/shared').NeighborId]
        ?.locationId ?? NPCS[merchant].location
    )
  }
  return (
    city.state.npcPlacements[step.npcId as import('@saigon/shared').NeighborId]
      ?.locationId ?? NPCS[step.npcId].location
  )
}
function storySteps(state: GameState): HubStep[] {
  const quest = trackedQuest(state)
  if (quest)
    return [
      ...quest.steps.map((_step, index) => ({
        title: stepLine(quest, index),
        detail: quest.progress[index]
          ? m.hub_completed()
          : m.hub_next_kindness(),
        state: quest.progress[index]
          ? ('done' as const)
          : index === quest.progress.findIndex((done) => !done)
            ? ('now' as const)
            : ('next' as const),
      })),
      {
        title: m.hub_return_to({ name: npcLabel(quest.giverNpcId) }),
        detail: m.hub_collect_thanks(),
        state: quest.status === 'ready' ? 'now' : 'next',
      },
    ]
  return cityTrail().map((stop) => ({
    title: stop.title,
    detail: stop.detail,
    state: state.world.visitedLocations.includes(stop.location)
      ? 'done'
      : 'next',
  }))
}
function questStatus(status: Quest['status']) {
  const labels: Record<Quest['status'], () => string> = {
    active: m.quest_status_active,
    ready: m.quest_status_ready,
    completed: m.quest_status_completed,
  }
  return labels[status]()
}
function secretSteps(state: GameState): HubSecret[] {
  return [
    ...state.quests.map((quest) => ({
      id: quest.id,
      title: quest.title,
      detail: `${npcLabel(quest.giverNpcId)} · ${questStatus(quest.status)}`,
      state: 'now' as const,
    })),
    ...state.completed.map((quest) => ({
      id: quest.id,
      title: quest.title,
      detail: m.hub_completed(),
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

/** Legs shorter than this are a pleasant walk; the hub suggests on foot. */
const WALKABLE_LEG = 70

export function cheapestRide(state: GameState): HubRide | null {
  const to = nextStop(state)
  if (!to) return null
  // A short next leg is better walked than paid for; suggest no ride.
  if (distance(PLACES[state.stop].at, PLACES[to].at) < WALKABLE_LEG) return null
  const [mode] = (Object.keys(MODES) as TravelMode[])
    .filter((id) => MODES[id].fare <= state.world.currency)
    .sort((a, b) => MODES[a].fare - MODES[b].fare)
  if (!mode) return null
  return {
    mode,
    name: modeName(mode),
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
        ? m.hub_lede_done()
        : current
          ? m.hub_lede_next({
              title: current.title.toLowerCase(),
              detail: current.detail,
            })
          : '',
    story: {
      title: active?.title ?? m.hub_story_default(),
      steps,
      secrets,
      coins: active?.reward.currency ?? 0,
      done,
    },
    neighbor: last
      ? {
          id: last,
          name: npcLabel(last),
          role: npcDisplay(last).role,
          line: state.lastLine[last] ?? npcDisplay(last).knowledge[0],
          source: state.source,
        }
      : null,
    ride: cheapestRide(state),
    places: ids.map((id) => ({
      id,
      label: placeName(id),
      visited: state.world.visitedLocations.includes(id),
      here: state.world.locationId === id,
    })),
    discovered: ids.filter((id) => state.world.visitedLocations.includes(id))
      .length,
    total: ids.length,
    muted: state.muted,
    volume: state.volume,
    milestone: milestoneBoard(state),
  }
}
