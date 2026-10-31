import {
  type AgentSource,
  type NpcId,
  type PlayerEvent,
  type Quest,
  STARTING_CURRENCY,
  type WorldState,
} from '@saigon/shared'
import { Store } from '@tanstack/store'
import { type Point, SPAWN, type TravelMode } from '@/shared/world/places'

export type Panel =
  | 'none'
  | 'journal'
  | 'map'
  | 'settings'
  | 'transport'
  | 'reward'
  | 'people'
  | 'market'
  | 'postcard'
export interface Dialogue {
  npc: NpcId
  requestId: string
  history: { role: 'user' | 'assistant'; content: string }[]
  thinking: boolean
  source: AgentSource | null
}
export interface Ride {
  from: WorldState['locationId']
  to: WorldState['locationId']
  mode: TravelMode
  progress: number
}
export interface GameState {
  screen: 'title' | 'playing' | 'paused' | 'hub'
  panel: Panel
  serverRevision: number
  sessionId: string
  guestId: string | null
  guestName: string | null
  guestColor: string | null
  guestStatus: 'loading' | 'online' | 'offline' | 'resetting'
  returningGuest: boolean
  generation: number
  position: Point
  world: WorldState
  quest: Quest | null
  completed: Quest[]
  dialogue: Dialogue | null
  lastLine: Partial<Record<NpcId, string>>
  hubShown: boolean
  /** World events observed since the last server sync. */
  pending: PlayerEvent[]
  ride: Ride | null
  stop: WorldState['locationId']
  source: AgentSource | null
  toast: string
  muted: boolean
  volume: number
  reducedMotion: boolean
  reward: number
  rewardQuest: Quest | null
  reputation: number
  timeOfDay: 'day' | 'evening'
  viewpoint: 'river' | null
}
export function initialState(generation = 0): GameState {
  return {
    serverRevision: 0,
    screen: 'title',
    panel: 'none',
    generation,
    sessionId: crypto.randomUUID(),
    guestId: null,
    guestName: null,
    guestColor: null,
    guestStatus: 'loading',
    returningGuest: false,
    position: [...SPAWN],
    world: {
      locationId: 'market',
      inventory: {},
      visitedLocations: ['market'],
      talkedTo: [],
      deliveredItems: [],
      completedQuestIds: [],
      currency: STARTING_CURRENCY,
    },
    quest: null,
    completed: [],
    dialogue: null,
    lastLine: {},
    hubShown: false,
    pending: [],
    ride: null,
    stop: 'market',
    source: null,
    toast: '',
    muted: false,
    volume: 0.5,
    reducedMotion: false,
    reward: 0,
    rewardQuest: null,
    reputation: 0,
    timeOfDay: 'day',
    viewpoint: null,
  }
}
export const game = new Store<GameState>(initialState())
export const update = (patch: Partial<GameState>) =>
  game.setState((state) => ({ ...state, ...patch }))
let toastTimer: ReturnType<typeof setTimeout>
export function notify(toast: string) {
  clearTimeout(toastTimer)
  update({ toast })
  toastTimer = setTimeout(() => update({ toast: '' }), 4500)
}
export function grantQuest(state: GameState, quest: Quest): GameState {
  if (state.quest || state.world.completedQuestIds.includes(quest.id))
    return state
  const item =
    quest.objective.type === 'DELIVER' ? quest.objective.itemId : null
  return {
    ...state,
    quest,
    world: {
      ...state.world,
      inventory: item
        ? {
            ...state.world.inventory,
            [item]: (state.world.inventory[item] ?? 0) + 1,
          }
        : state.world.inventory,
    },
  }
}
export function grantReward(state: GameState, quest: Quest): GameState {
  if (
    !state.quest ||
    state.quest.id !== quest.id ||
    state.world.completedQuestIds.includes(quest.id)
  )
    return state
  return {
    ...state,
    quest: null,
    completed: [...state.completed, quest],
    reward: quest.reward.currency,
    rewardQuest: quest,
    reputation: state.reputation + quest.reward.reputation,
    panel: 'reward',
    dialogue: null,
    world: {
      ...state.world,
      currency: state.world.currency + quest.reward.currency,
      completedQuestIds: [...state.world.completedQuestIds, quest.id],
      inventory: quest.reward.itemId
        ? {
            ...state.world.inventory,
            [quest.reward.itemId]:
              (state.world.inventory[quest.reward.itemId] ?? 0) + 1,
          }
        : state.world.inventory,
    },
  }
}

/** Mark a place as visited and queue the event for the next server sync. */
export function visit(
  state: GameState,
  place: WorldState['locationId']
): Partial<GameState> {
  const seen = state.world.visitedLocations.includes(place)
  if (seen && state.world.locationId === place) return {}
  return {
    world: {
      ...state.world,
      locationId: place,
      visitedLocations: seen
        ? state.world.visitedLocations
        : [...state.world.visitedLocations, place],
    },
    pending: [...state.pending, { type: 'visit', locationId: place }],
  }
}
