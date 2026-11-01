import {
  advance,
  type CityEvent,
  createQuest,
  type Quest,
  type QuestSpec,
  RIDDLE_REVEAL_MS,
} from '@saigon/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { board } from '@/app/actions'
import { npcIsQuestTarget, npcMarker } from '@/features/npcs/npc-label'
import { arriveAside, asideFor, resetAsides } from '@/features/transport/asides'
import { gossipLines } from '@/features/transport/gossip'
import { interactWith } from '@/shared/api/agent'
import { saveToken } from '@/shared/api/transport'
import { game, initialState } from '@/shared/state/game'
import { installRiddles, resetRiddles } from '@/shared/state/riddles'
import { clock } from '@/shared/state/ui'

const riddleSpec: QuestSpec = {
  giverNpcId: 'hoa',
  title: 'A market riddle',
  description: 'Solve where to go.',
  scope: 'solo',
  steps: [{ type: 'TALK_TO', npcId: 'linh' }],
  riddle: { text: 'Find the neighbor who hands out committee titles.' },
}
function riddleQuest(createdAt = 1_000_000): Quest {
  return createQuest(riddleSpec, 'q_riddle', createdAt)
}

afterEach(() => {
  game.setState(() => initialState())
  resetRiddles()
  resetAsides()
})

describe('3b no spoiler from the world label', () => {
  it('does not mark the answer NPC while the riddle hides step 0', () => {
    const now = 1_000_000
    const state = { ...initialState(), quests: [riddleQuest(now)] }
    expect(npcIsQuestTarget(state, 'linh', now)).toBe(false)
    expect(npcMarker(state, 'linh', now)).toBe('')
  })
  it('marks the answer NPC once the riddle is revealed', () => {
    const now = 1_000_000
    const state = { ...initialState(), quests: [riddleQuest(now)] }
    expect(npcIsQuestTarget(state, 'linh', now + RIDDLE_REVEAL_MS)).toBe(true)
    expect(npcMarker(state, 'linh', now + RIDDLE_REVEAL_MS)).toBe('!')
  })
})

describe('3b reveal store toasts', () => {
  it('toasts the matching reveal reason when a riddle reveals', () => {
    const now = 1_000_000
    clock.setState(() => ({ now }))
    game.setState((s) => ({ ...s, quests: [riddleQuest(now)] }))
    const stop = installRiddles()
    // Reveal via a cyclo spend.
    game.setState((s) => ({
      ...s,
      quests: [
        advance(s.quests[0], { type: 'spend', amount: 3, mode: 'cyclo' }, now),
      ],
    }))
    expect(game.state.toast).toContain('cyclo')
    stop()
  })
  it('toasts sharp eye when solved', () => {
    const now = 1_000_000
    clock.setState(() => ({ now }))
    game.setState((s) => ({ ...s, quests: [riddleQuest(now)] }))
    const stop = installRiddles()
    game.setState((s) => ({
      ...s,
      quests: [advance(s.quests[0], { type: 'talk', npcId: 'linh' }, now)],
    }))
    expect(game.state.toast.toLowerCase()).toContain('sharp')
    stop()
  })
})

describe('3b offline greet reveal reply', () => {
  beforeEach(() => {
    saveToken('offline-test-token')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  })
  afterEach(() => vi.unstubAllGlobals())
  it('replies with the authored reveal when a greet reveals the riddle', async () => {
    // offline() advances with Date.now(); keep the riddle within its window.
    const state = {
      ...initialState(),
      quests: [riddleQuest(Date.now())],
      guestStatus: 'offline' as const,
    }
    game.setState(() => state)
    const { response } = await interactWith(
      'mai',
      {
        message: '',
        intent: 'greet',
        worldContext: {
          playerLocation: 'market',
          nearbyNpcs: ['mai'],
          timeOfDay: 'afternoon',
        },
      },
      game.state
    )
    expect(response.reply).toContain('That riddle?')
    expect(response.reply).toContain('Linh')
  })
})

describe('3c gossip', () => {
  const event: CityEvent = {
    id: 'e1',
    kind: 'festival',
    locationId: 'cathedral',
    title: 'Lantern fair',
    description: 'Lanterns at the square.',
    startedAt: 0,
    endsAt: 600_000,
  }
  it('is deterministic per input', () => {
    const input = {
      mode: 'cyclo' as const,
      destination: 'park' as const,
      event,
      quest: null,
      now: 1_000_000,
    }
    expect(gossipLines(input)).toEqual(gossipLines(input))
  })
  it('gives a single line to non-cyclo modes', () => {
    expect(
      gossipLines({
        mode: 'xeom',
        destination: 'park',
        event: null,
        quest: null,
        now: 1,
      })
    ).toHaveLength(1)
  })
  it('reveals the riddle on the last cyclo line', () => {
    const now = 1_000_000
    const lines = gossipLines({
      mode: 'cyclo',
      destination: 'cathedral',
      event: null,
      quest: riddleQuest(now),
      now,
    })
    expect(lines.at(-1)).toContain('Linh')
  })
})

describe('3c narrator asides', () => {
  it('names the short-hop xe om line and the long walk line', () => {
    expect(asideFor('xeom', 20)).toBeTruthy()
    expect(asideFor('xeom', 200)).toBeNull()
    expect(asideFor('walk', 200)).toBeTruthy()
    expect(asideFor('walk', 20)).toBeNull()
  })
  it('fires at most once per 20 seconds', () => {
    game.setState(() => initialState())
    arriveAside('xeom', 20, 'park', 0)
    expect(game.state.toast).toBeTruthy()
    game.setState((s) => ({ ...s, toast: '' }))
    // A different place within the cooldown stays silent.
    arriveAside('xeom', 20, 'market', 5_000)
    expect(game.state.toast).toBe('')
    // After the cooldown a new place speaks again.
    arriveAside('xeom', 20, 'cathedral', 25_000)
    expect(game.state.toast).toBeTruthy()
  })
})

describe('3c board advances locally', () => {
  it('accrues spent and reveals a riddle immediately on a cyclo', () => {
    // board() advances with Date.now(); use a fresh createdAt so the riddle
    // is still within its reveal window.
    const now = Date.now()
    clock.setState(() => ({ now }))
    game.setState((s) => ({
      ...s,
      screen: 'playing',
      stop: 'market',
      quests: [riddleQuest(now)],
      trackedQuestId: 'q_riddle',
      world: { ...s.world, currency: 30 },
    }))
    board('park', 'cyclo')
    const quest = game.state.quests[0]
    expect(quest.spent).toBe(3)
    expect(quest.revealed).toBe('cyclo')
    expect(game.state.world.currency).toBe(27)
    expect(game.state.pending.at(-1)).toMatchObject({
      type: 'spend',
      amount: 3,
      mode: 'cyclo',
    })
  })
})
