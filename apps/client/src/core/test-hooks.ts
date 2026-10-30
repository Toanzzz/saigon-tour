import { DEMO_QUEST } from '@saigon/shared'
import { game, initialState, update } from '../state/game'
import { clearInput } from './input'
import { motion } from './motion'
import { PLACES, SPAWN } from './places'

type TestState =
  | 'title'
  | 'active-play'
  | 'mobile-active-play'
  | 'quest'
  | 'reward'
  | 'transport'
  | 'riding'
  | 'cityhall'
  | 'cathedral'

let screenshotPaused = false
let debugUiHidden = false
let activeSeed = 0

declare global {
  interface Window {
    __THREE_GAME_TEST_HOOKS__?: {
      seed: (value: number) => void
      setState: (name: string) => { state: string }
      setPausedForScreenshot: (paused: boolean) => void
      setReducedMotion: (reduced: boolean) => void
      hideDebugUi: (hidden: boolean) => void
      teleport: (x: number, z: number) => void
    }
  }
}

export function isTestPausedForScreenshot() {
  return screenshotPaused
}

function resetState(patch: Partial<ReturnType<typeof initialState>>) {
  const state = initialState(game.state.generation + 1)
  game.setState(() => ({
    ...state,
    sessionId: `seeded-${activeSeed}`,
    ...patch,
  }))
  clearInput()
  motion.position.set(...(patch.position ?? SPAWN))
  motion.heading = 0
}

function setTestState(name: string) {
  if (!isTestState(name)) throw new Error(`Unknown test state: ${name}`)
  const requestId = `test-${activeSeed}-${name}`
  if (name === 'title') {
    resetState({ screen: 'title' })
  } else if (name === 'quest') {
    resetState({
      screen: 'playing',
      position: [-23, 0.9, 3.5],
      world: {
        ...initialState().world,
        locationId: 'market',
        talkedTo: ['hoa'],
        inventory: { herbs: 1 },
      },
      quest: DEMO_QUEST,
      dialogue: {
        npc: 'hoa',
        requestId,
        history: [
          {
            role: 'assistant',
            content:
              'Chào bạn! I have fresh herbs for Chị Linh’s community lunch.',
          },
          {
            role: 'assistant',
            content: 'Take them to the park when you have a moment.',
          },
        ],
        thinking: false,
        source: 'live',
      },
      source: 'live',
    })
  } else if (name === 'reward') {
    resetState({
      screen: 'playing',
      panel: 'reward',
      position: [24, 0.9, -5],
      world: {
        ...initialState().world,
        locationId: 'park',
        visitedLocations: ['market', 'park'],
        deliveredItems: ['herbs:linh'],
        completedQuestIds: [DEMO_QUEST.id],
        inventory: { postcard: 1 },
        currency: 80,
      },
      completed: [DEMO_QUEST],
      reward: 50,
      reputation: 1,
      source: 'live',
    })
  } else if (name === 'transport') {
    resetState({
      screen: 'playing',
      panel: 'transport',
      position: [-10, 0.9, 12],
      world: { ...initialState().world, locationId: 'market' },
      stop: 'market',
    })
  } else if (name === 'riding') {
    resetState({
      screen: 'playing',
      position: [-10, 0.9, 12],
      world: { ...initialState().world, locationId: 'market', currency: 25 },
      stop: 'market',
      ride: { from: 'market', to: 'park', mode: 'bus', progress: 0.45 },
    })
  } else if (name === 'cityhall' || name === 'cathedral') {
    const place = PLACES[name]
    resetState({
      screen: 'playing',
      position: [place.at[0], 0.9, place.at[2] + 10],
      stop: name,
      world: {
        ...initialState().world,
        locationId: name,
        visitedLocations: ['market', name],
      },
    })
  } else {
    resetState({
      screen: 'playing',
      position: SPAWN,
      world: { ...initialState().world, locationId: 'market' },
    })
  }
  return { state: name }
}

function isTestState(name: string): name is TestState {
  return [
    'title',
    'active-play',
    'mobile-active-play',
    'quest',
    'reward',
    'transport',
    'riding',
    'cityhall',
    'cathedral',
  ].includes(name)
}

export function installTestHooks() {
  const enabled =
    import.meta.env.DEV || new URLSearchParams(location.search).has('debug')
  if (!enabled) return
  window.__THREE_GAME_TEST_HOOKS__ = {
    seed(value) {
      if (!Number.isSafeInteger(value))
        throw new Error('Seed must be an integer')
      activeSeed = value
      game.setState((state) => ({
        ...state,
        sessionId: `seeded-${value}`,
      }))
    },
    setState: setTestState,
    setPausedForScreenshot(paused) {
      screenshotPaused = paused
      if (paused) clearInput()
    },
    setReducedMotion(reduced) {
      update({ reducedMotion: reduced })
    },
    hideDebugUi(hidden) {
      debugUiHidden = hidden
    },
    teleport(x, z) {
      clearInput()
      motion.teleport = [x, z]
    },
  }
}

export function isDebugUiHidden() {
  return debugUiHidden
}
