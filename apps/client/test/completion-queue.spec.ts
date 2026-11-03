import type {
  CompletedQuest,
  InteractResponse,
  Quest,
  ServerSocketMessage,
} from '@saigon/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { converse } from '@/features/conversation/converse'
import { resetEventSequence } from '@/shared/api/events'
import { completedQuest, handlePartyMessage } from '@/shared/api/party'
import { updateNet } from '@/shared/api/status'
import { saveToken } from '@/shared/api/transport'
import {
  completionQuest,
  nextCompletion,
  queueCompletions,
} from '@/shared/state/completions'
import { game, initialState } from '@/shared/state/game'
import { completedFixture, questFixture } from './quest-fixture'

const first: Quest = {
  ...questFixture(undefined, 'q_receipt_first'),
  status: 'completed',
  progress: [true],
  payoff: 'Thank you for taking the herbs to Linh.',
}
const second: Quest = {
  ...questFixture(undefined, 'q_receipt_second'),
  status: 'completed',
  progress: [true],
  payoff: 'Linh has the second parcel. Thank you, con.',
}
const summaries = [completedFixture(first), completedFixture(second)]
const receipt = (
  quest: Quest,
  completed: CompletedQuest[] = summaries,
  revision = 4
): Extract<ServerSocketMessage, { type: 'quest-completed' }> => ({
  type: 'quest-completed',
  quest,
  completed,
  revision,
  friendship: {},
  quests: [],
  world: {
    ...initialState().world,
    currency: 110,
    completedQuestIds: completed.map((entry) => entry.id),
  },
  reputation: completed.reduce(
    (sum, entry) => sum + entry.reward.reputation,
    0
  ),
  unlocks: { owned: [], equipped: {} },
})

beforeEach(() => {
  resetEventSequence()
  updateNet({ party: null, partyVersion: 0 })
  saveToken('completion-queue-token')
  game.setState(() => ({
    ...initialState(),
    guestStatus: 'online',
    dialogue: {
      npc: 'hoa',
      requestId: 'receipt-http',
      history: [],
      thinking: false,
      source: null,
    },
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('completion receipts', () => {
  it('queues each reward separately and advances in arrival order', () => {
    const queued = {
      ...initialState(),
      ...queueCompletions(initialState(), [first, second]),
    }
    expect(queued.rewardQueue.map((quest) => quest.id)).toEqual([
      first.id,
      second.id,
    ])
    expect(queued.rewardQuest?.id).toBe(first.id)
    expect(queued.reward).toBe(first.reward.currency)
    const next = { ...queued, ...nextCompletion(queued) }
    expect(next.rewardQuest?.id).toBe(second.id)
    expect(next.reward).toBe(second.reward.currency)
    expect(nextCompletion(next)).toMatchObject({
      rewardQueue: [],
      rewardQuest: null,
      reward: 0,
    })
  })

  it('upgrades a queued generated quest even when it has no payoff', () => {
    const { payoff: _payoff, ...generated } = second
    const summary = completionQuest(completedFixture(generated))
    const queued = {
      ...initialState(),
      ...queueCompletions(initialState(), [summary]),
    }
    const upgraded = queueCompletions(queued, [generated])
    expect(upgraded.rewardQueue).toEqual([generated])
    expect(upgraded.rewardQuest?.description).toBe(generated.description)
    expect(upgraded.rewardQuest?.steps).toEqual(generated.steps)
  })

  it('does not interrupt another panel when a socket notification repeats', () => {
    const queued = completedQuest(initialState(), receipt(first))
    const browsing = { ...queued, panel: 'wardrobe' as const }
    const duplicate = completedQuest(browsing, receipt(first))
    expect(duplicate.panel).toBe('wardrobe')
    expect(duplicate.rewardQueue).toHaveLength(2)
    expect(duplicate.world.currency).toBe(browsing.world.currency)
  })

  it('accepts late queued metadata without applying an older server save', () => {
    const queued = completedQuest(initialState(), receipt(first))
    const newer = {
      ...queued,
      serverRevision: 5,
      world: { ...queued.world, currency: 105 },
    }
    const upgraded = completedQuest(newer, receipt(second))
    expect(upgraded.serverRevision).toBe(5)
    expect(upgraded.world.currency).toBe(105)
    expect(upgraded.rewardQueue[1]?.payoff).toBe(second.payoff)
    expect(upgraded.completed).toEqual(summaries)
  })

  it('upgrades queued metadata while another panel is open', () => {
    const queued = completedQuest(initialState(), receipt(first))
    const browsing = { ...queued, panel: 'wardrobe' as const }
    const upgraded = completedQuest(browsing, receipt(second))
    expect(upgraded.panel).toBe('wardrobe')
    expect(upgraded.rewardQueue[1]?.payoff).toBe(second.payoff)
  })

  it.each([4, 5])(
    'upgrades a queued socket summary from HTTP without double granting at revision %i',
    async (socketRevision) => {
      let resolve: (response: Response) => void = () => {
        throw new Error('HTTP fixture not started')
      }
      const fetchMock = vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done
          })
      )
      vi.stubGlobal('fetch', fetchMock)
      const pending = converse('I brought everything back.', 'chat')
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      handlePartyMessage(receipt(first, summaries, socketRevision))
      const reply: InteractResponse = {
        npcId: 'hoa',
        revision: 4,
        cached: false,
        party: null,
        reply: second.payoff ?? '',
        source: 'fallback',
        degraded: false,
        friendship: {},
        friendshipEvents: [],
        world: receipt(first).world,
        quests: [],
        questEvents: [
          { type: 'completed', quest: second, reward: second.reward },
        ],
        toolCalls: [],
      }
      resolve(Response.json(reply))
      await pending
      expect(game.state.rewardQueue).toHaveLength(2)
      expect(game.state.rewardQueue[1]?.payoff).toBe(second.payoff)
      expect(game.state.completed).toEqual(summaries)
      expect(game.state.reputation).toBe(2)
      expect(game.state.world.currency).toBe(110)
      expect(game.state.serverRevision).toBe(socketRevision)
    }
  )

  it('does not replay a dismissed receipt when its full notification arrives', () => {
    const queued = completedQuest(initialState(), receipt(first))
    const next = { ...queued, ...nextCompletion(queued) }
    const finished = {
      ...next,
      ...nextCompletion(next),
      panel: 'none' as const,
    }
    const duplicate = completedQuest(finished, receipt(second))
    expect(duplicate.panel).toBe('none')
    expect(duplicate.rewardQueue).toEqual([])
    expect(duplicate.rewardQuest).toBeNull()
    expect(duplicate.world.currency).toBe(110)
  })

  it('keeps a metadata upgrade when the same HTTP result grants another quest', async () => {
    const third: Quest = { ...first, id: 'q_receipt_third' }
    let resolve: (response: Response) => void = () => {
      throw new Error('HTTP fixture not started')
    }
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done
        })
    )
    vi.stubGlobal('fetch', fetchMock)
    const pending = converse('Everything is delivered.', 'chat')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    handlePartyMessage(receipt(first))
    const reply: InteractResponse = {
      npcId: 'hoa',
      revision: 5,
      cached: false,
      party: null,
      reply: second.payoff ?? '',
      source: 'fallback',
      degraded: false,
      friendship: {},
      friendshipEvents: [],
      world: { ...receipt(first).world, currency: 150 },
      quests: [],
      questEvents: [second, third].map((quest) => ({
        type: 'completed' as const,
        quest,
        reward: quest.reward,
      })),
      toolCalls: [],
    }
    resolve(Response.json(reply))
    await pending
    expect(game.state.rewardQueue.map((quest) => quest.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ])
    expect(game.state.rewardQueue[1]?.payoff).toBe(second.payoff)
    expect(game.state.completed).toHaveLength(3)
    expect(game.state.reputation).toBe(3)
    expect(game.state.world.currency).toBe(150)
  })
})
