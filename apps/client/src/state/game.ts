import {
  type AgentSource,
  type NpcId,
  type Quest,
  STARTING_CURRENCY,
  type WorldState,
} from '@saigon/shared'
import { Store } from '@tanstack/store'
import { type Point, SPAWN, type TravelMode } from '../core/places'

export type Panel =
  | 'none'
  | 'journal'
  | 'map'
  | 'settings'
  | 'transport'
  | 'reward'
export interface Dialogue {
  npc: NpcId
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
  screen: 'title' | 'playing' | 'paused'
  panel: Panel
  sessionId: string
  generation: number
  position: Point
  world: WorldState
  quest: Quest | null
  completed: Quest[]
  dialogue: Dialogue | null
  ride: Ride | null
  stop: WorldState['locationId']
  source: AgentSource | null
  toast: string
  muted: boolean
  volume: number
  reducedMotion: boolean
  reward: number
  reputation: number
}
export function initialState(generation = 0): GameState {
  return {
    screen: 'title',
    panel: 'none',
    generation,
    sessionId: crypto.randomUUID(),
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
    ride: null,
    stop: 'market',
    source: null,
    toast: '',
    muted: false,
    volume: 0.5,
    reducedMotion: false,
    reward: 0,
    reputation: 0,
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
