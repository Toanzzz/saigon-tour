import {
  advance,
  createQuest,
  isRevealed,
  type Quest,
  type QuestSpec,
  RIDDLE_REVEAL_MS,
} from '@saigon/shared'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { buyMarketItem } from '@/app/actions'
import { questPin } from '@/features/map/targets'
import { queryClient } from '@/shared/api/agent'
import { city, resetCity } from '@/shared/api/city'
import { game, initialState } from '@/shared/state/game'
import {
  questHint,
  questTarget,
  stepCopy,
  stepLine,
} from '@/shared/state/quests'
import { clock } from '@/shared/state/ui'
import { hubView } from '@/widgets/hub'
import { Objective } from '@/widgets/hud/objective'

/** A hoa riddle quest hiding a GO_TO cathedral step 0. */
const riddleSpec: QuestSpec = {
  giverNpcId: 'hoa',
  title: 'A market riddle',
  description: 'Solve where to go.',
  scope: 'solo',
  steps: [{ type: 'GO_TO', locationId: 'cathedral' }],
  riddle: { text: 'Two red-brick towers keep the square\u2019s echo.' },
}

function riddleQuest(createdAt = 1_000_000): Quest {
  return createQuest(riddleSpec, 'q_riddle', createdAt)
}

function withQuest(quest: Quest, now: number) {
  clock.setState(() => ({ now }))
  game.setState((s) => ({
    ...s,
    quests: [quest],
    trackedQuestId: quest.id,
  }))
}

afterEach(() => {
  resetCity()
  game.setState(() => initialState())
})

describe('3a moved-target copy', () => {
  it('appends the current place when a neighbor left home', () => {
    // Linh's home is the park; move her to the market.
    city.setState((s) => ({
      ...s,
      npcPlacements: {
        ...s.npcPlacements,
        linh: {
          locationId: 'market' as const,
          anchorId: 'market-a',
          position: [0, 0, 0] as [number, number, number],
        },
      },
    }))
    const copy = stepCopy({ type: 'TALK_TO', npcId: 'linh' })
    expect(copy).toContain('now at')
    expect(copy).toContain('Ben Thanh')
  })
  it('does not append when the neighbor is home', () => {
    const copy = stepCopy({ type: 'TALK_TO', npcId: 'linh' })
    expect(copy).not.toContain('now at')
  })
})

describe('3a market credit', () => {
  it('fronts an unaffordable quest BUY and never charges coins', () => {
    const buyQuest = createQuest(
      {
        giverNpcId: 'hoa',
        title: 'Buy a coffee',
        description: 'Buy a coffee at the market.',
        scope: 'solo',
        steps: [{ type: 'BUY', marketItemId: 'coffee' }],
      },
      'q_buy',
      Date.now()
    )
    game.setState((s) => ({
      ...s,
      quests: [buyQuest],
      trackedQuestId: buyQuest.id,
      world: {
        ...s.world,
        currency: 0,
        locationId: 'market',
      },
    }))
    buyMarketItem('coffee')
    const state = game.state
    expect(state.world.currency).toBe(0)
    expect(state.world.inventory.coffee).toBe(1)
    expect(state.quests[0]?.progress[0]).toBe(true)
    expect(state.pending.at(-1)).toMatchObject({
      type: 'purchase',
      itemId: 'coffee',
      credit: true,
    })
  })
  it('does not credit a non-quest BUY', () => {
    game.setState((s) => ({
      ...s,
      quests: [],
      world: { ...s.world, currency: 0, locationId: 'market' },
    }))
    buyMarketItem('coffee')
    expect(game.state.world.inventory.coffee ?? 0).toBe(0)
  })
})

describe('3b riddle hides the answer at the source', () => {
  it('questHint returns the riddle text while hidden, the step after reveal', () => {
    const now = 1_000_000
    withQuest(riddleQuest(now), now)
    expect(questHint(game.state.quests[0])).toBe(riddleSpec.riddle?.text)
    // Advance the clock past the reveal window.
    clock.setState(() => ({ now: now + RIDDLE_REVEAL_MS }))
    expect(questHint(game.state.quests[0])).toContain('Notre-Dame')
  })
  it('questTarget and questPin return null while hidden', () => {
    const now = 1_000_000
    withQuest(riddleQuest(now), now)
    expect(questTarget(game.state)).toBeNull()
    expect(questPin(game.state.quests[0])).toBeNull()
  })
  it('stepLine hides step 0 but shows later steps', () => {
    const now = 1_000_000
    const quest = createQuest(
      {
        ...riddleSpec,
        steps: [
          { type: 'GO_TO', locationId: 'cathedral' },
          { type: 'TALK_TO', npcId: 'mai' },
        ],
      },
      'q_riddle2',
      now
    )
    withQuest(quest, now)
    expect(stepLine(quest, 0)).toBe(riddleSpec.riddle?.text)
    expect(stepLine(quest, 1)).toContain('Mai')
  })
  it('the hub suggests no ride while the riddle hides the destination', () => {
    const now = 1_000_000
    withQuest(riddleQuest(now), now)
    const view = hubView({ ...game.state, stop: 'market' }, new Date(now))
    expect(view.ride).toBeNull()
  })
  it('the objective shows the riddle text and reveal options', () => {
    const now = 1_000_000
    withQuest(riddleQuest(now), now)
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <Objective state={game.state} />
      </QueryClientProvider>
    )
    expect(html).toContain(riddleSpec.riddle?.text)
    expect(html).toContain('Ride a cyclo')
  })
})

describe('3b reveal paths (engine via client state)', () => {
  it('reveals on a cyclo spend', () => {
    const now = 1_000_000
    const quest = advance(
      riddleQuest(now),
      { type: 'spend', amount: 3, mode: 'cyclo' },
      now
    )
    expect(quest.revealed).toBe('cyclo')
    expect(isRevealed(quest, now)).toBe(true)
  })
  it('reveals on a talk to another neighbor', () => {
    const now = 1_000_000
    const quest = advance(riddleQuest(now), { type: 'talk', npcId: 'mai' }, now)
    expect(quest.revealed).toBe('talk')
  })
  it('reveals solved on reaching the answer', () => {
    const now = 1_000_000
    const quest = advance(
      riddleQuest(now),
      { type: 'visit', locationId: 'cathedral' },
      now
    )
    expect(quest.revealed).toBe('solved')
  })
  it('reveals by time after the window', () => {
    const now = 1_000_000
    const quest = riddleQuest(now)
    expect(isRevealed(quest, now + RIDDLE_REVEAL_MS)).toBe(true)
  })
})
