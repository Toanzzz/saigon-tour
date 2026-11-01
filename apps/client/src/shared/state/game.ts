import {
  type AgentSource,
  type AvatarBody,
  advance,
  type CompletedQuest,
  EMPTY_UNLOCKS,
  type FriendshipMap,
  type NpcId,
  type PlayerEvent,
  type Quest,
  STARTING_CURRENCY,
  type Unlocks,
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
  | 'wardrobe'
export interface Dialogue {
  npc: NpcId
  requestId: string
  history: { role: 'user' | 'assistant'; content: string; greeting?: boolean }[]
  earlierCount?: number
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
  friendship: FriendshipMap
  serverRevision: number
  sessionId: string
  guestId: string | null
  guestName: string | null
  /** Chosen body is identity, persisted locally and server-side; survives New journey. */
  body: AvatarBody
  guestColor: string | null
  guestStatus: 'loading' | 'online' | 'offline' | 'resetting'
  returningGuest: boolean
  /** Anonymous play by default; `meta` once linked to a Meta account. */
  account: 'anonymous' | 'meta' | null
  metaAvailable: boolean
  generation: number
  position: Point
  world: WorldState
  quests: Quest[]
  trackedQuestId: string | null
  completed: CompletedQuest[]
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
  unlocks: Unlocks
}
export function initialState(generation = 0): GameState {
  return {
    friendship: {},
    serverRevision: 0,
    screen: 'title',
    panel: 'none',
    generation,
    sessionId: crypto.randomUUID(),
    guestId: null,
    guestName: null,
    body: 'man',
    guestColor: null,
    guestStatus: 'loading',
    returningGuest: false,
    account: null,
    metaAvailable: false,
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
    quests: [],
    trackedQuestId: null,
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
    unlocks: structuredClone(EMPTY_UNLOCKS),
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
export function trackedQuest(state: GameState): Quest | null {
  return (
    state.quests.find((quest) => quest.id === state.trackedQuestId) ??
    state.quests[0] ??
    null
  )
}
export function advanceQuests(quests: Quest[], events: PlayerEvent[]) {
  // reduce passes the index as the third arg; wrap so it never lands in `now`.
  return quests.map((quest) =>
    events.reduce((current, event) => advance(current, event), quest)
  )
}
export function grantQuest(state: GameState, quest: Quest): GameState {
  if (
    state.quests.length >= 3 ||
    state.quests.some((entry) => entry.id === quest.id) ||
    state.world.completedQuestIds.includes(quest.id)
  )
    return state
  const inventory = { ...state.world.inventory }
  for (const step of quest.steps) {
    if (step.type === 'DELIVER')
      inventory[step.itemId] = Math.min(100, (inventory[step.itemId] ?? 0) + 1)
  }
  return {
    ...state,
    quests: [...state.quests, quest],
    trackedQuestId: state.trackedQuestId ?? quest.id,
    world: { ...state.world, inventory },
  }
}
export function grantReward(state: GameState, quest: Quest): GameState {
  if (
    !state.quests.some(
      (entry) => entry.id === quest.id && entry.status === 'ready'
    ) ||
    state.world.completedQuestIds.includes(quest.id)
  )
    return state
  const quests = state.quests.filter((entry) => entry.id !== quest.id)
  const unlockId = quest.reward.unlockId
  const unlocks =
    unlockId && !state.unlocks.owned.includes(unlockId)
      ? {
          ...state.unlocks,
          owned: [...state.unlocks.owned, unlockId],
        }
      : state.unlocks
  return {
    ...state,
    quests,
    unlocks,
    trackedQuestId:
      state.trackedQuestId === quest.id
        ? (quests[0]?.id ?? null)
        : state.trackedQuestId,
    completed: [
      ...state.completed,
      {
        id: quest.id,
        title: quest.title,
        giverNpcId: quest.giverNpcId,
        reward: quest.reward,
        completedAt: Date.now(),
        ...(quest.milestone ? { milestone: quest.milestone } : {}),
      },
    ],
    reward: quest.reward.currency,
    rewardQuest: quest,
    reputation: state.reputation + quest.reward.reputation,
    panel: 'reward',
    dialogue: null,
    world: {
      ...state.world,
      currency: Math.min(100000, state.world.currency + quest.reward.currency),
      completedQuestIds: [...state.world.completedQuestIds, quest.id].slice(
        -32
      ),
      inventory: quest.reward.itemId
        ? {
            ...state.world.inventory,
            [quest.reward.itemId]: Math.min(
              100,
              (state.world.inventory[quest.reward.itemId] ?? 0) + 1
            ),
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
    quests: advanceQuests(state.quests, [{ type: 'visit', locationId: place }]),
    pending: [...state.pending, { type: 'visit', locationId: place }],
  }
}
