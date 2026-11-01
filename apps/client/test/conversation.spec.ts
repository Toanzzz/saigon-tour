import { completedFixture, questFixture } from './quest-fixture'

const quest = questFixture()
const partyQuest = { ...questFixture('mai'), status: 'completed' as const }
const summary = completedFixture(partyQuest)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { converse } from '@/features/conversation/converse'
import { acknowledgeWorld, resetEventSequence } from '@/shared/api/events'
import { handlePartyMessage } from '@/shared/api/party'
import { net, updateNet } from '@/shared/api/status'
import { saveToken } from '@/shared/api/transport'
import { game, initialState, update } from '@/shared/state/game'

const reply = () => ({
  npcId: 'hoa',
  reply: 'Chào bạn!',
  source: 'fallback',
  degraded: true,
  cached: true,
  party: null,
  world: initialState().world,
  quests: [],
  questEvents: [],
  toolCalls: [],
})
beforeEach(() => {
  resetEventSequence()
  updateNet({ party: null })
  saveToken('guest-token')
  game.setState(() => ({
    ...initialState(),
    guestStatus: 'online',
    dialogue: {
      npc: 'hoa',
      requestId: 'opening',
      history: [],
      thinking: true,
      source: null,
    },
    pending: [{ type: 'talk', npcId: 'hoa' }],
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('guest NPC turns', () => {
  it('sends greet with bearer auth and replays new optimistic events', async () => {
    let resolve!: (response: Response) => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((done) => {
          resolve = done
        })
    )
    vi.stubGlobal('fetch', fetchMock)
    const turn = converse('Hello!', 'greet', true)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    update({
      pending: [
        { type: 'spend', amount: 5 },
        { type: 'visit', locationId: 'park' },
      ],
    })
    resolve(Response.json(reply()))
    await turn
    const [url, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe('/api/npc/hoa/interact')
    expect(new Headers(options.headers).get('Authorization')).toBe(
      'Bearer guest-token'
    )
    expect(JSON.parse(options.body as string)).toMatchObject({
      intent: 'greet',
      events: [{ type: 'talk', npcId: 'hoa' }],
    })
    expect(JSON.parse(options.body as string)).not.toHaveProperty('playerId')
    expect(game.state.world.currency).toBe(25)
    expect(game.state.world.locationId).toBe('park')
    expect(game.state.pending).toHaveLength(2)
    expect(game.state.dialogue?.thinking).toBe(false)
  })
  it('keeps offline play and restores unsynced events after a storage outage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 }))
    )
    await converse('Hello!', 'greet', true)
    expect(game.state.source).toBe('fallback')
    expect(game.state.dialogue?.thinking).toBe(false)
    expect(game.state.pending).toEqual([{ type: 'talk', npcId: 'hoa' }])
    expect(game.state.lastLine.hoa).toContain('Chào bạn')
  })
})

async function deferredTurn() {
  let resolve!: (response: Response) => void
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((done) => {
        resolve = done
      })
  )
  vi.stubGlobal('fetch', fetchMock)
  const turn = converse('Help, please!', 'help', true)
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  return { turn, resolve }
}
const oldParty = {
  id: '11111111-1111-4111-8111-111111111111',
  members: [],
}
const soloReply = (revision: number, currency: number) => ({
  ...reply(),
  revision,
  party: oldParty,
  world: { ...initialState().world, currency, inventory: { herbs: 1 } },
  quests: [quest],
  questEvents: [{ type: 'offered', quest, reward: quest.reward }],
})
describe('HTTP and socket ordering', () => {
  it('replays a pending delivery into quest progress after HTTP returns', async () => {
    const { turn, resolve } = await deferredTurn()
    update({ pending: [{ type: 'deliver', itemId: 'herbs', npcId: 'linh' }] })
    resolve(Response.json(soloReply(1, 30)))
    await turn
    expect(game.state.world.inventory.herbs).toBe(0)
    expect(game.state.quests[0]?.status).toBe('ready')
  })
  it('syncs a newer solo save after a team push closes its dialogue', async () => {
    const { turn, resolve } = await deferredTurn()
    handlePartyMessage({
      type: 'quest-completed',
      revision: 2,
      quest: partyQuest,
      quests: [],
      world: {
        ...initialState().world,
        currency: 70,
        completedQuestIds: [partyQuest.id],
      },
      completed: [summary],
      reputation: 2,
    })
    expect(game.state.dialogue).toBeNull()
    resolve(Response.json(soloReply(3, 70)))
    await turn
    expect(game.state.quests).toEqual([quest])
    expect(game.state.world.inventory.herbs).toBe(1)
    expect(game.state.world.currency).toBe(70)
    expect(game.state.dialogue).toBeNull()
  })
  it('does not resurrect a party left while HTTP was pending', async () => {
    updateNet({ party: oldParty })
    const { turn, resolve } = await deferredTurn()
    handlePartyMessage({ type: 'party', party: null })
    resolve(Response.json(soloReply(1, 30)))
    await turn
    expect(net.state.party).toBeNull()
  })
  it('rejects an older HTTP save after a newer team reward push', async () => {
    const { turn, resolve } = await deferredTurn()
    handlePartyMessage({
      type: 'quest-completed',
      revision: 4,
      quest: partyQuest,
      quests: [],
      world: {
        ...initialState().world,
        currency: 70,
        completedQuestIds: [partyQuest.id],
      },
      completed: [summary],
      reputation: 2,
    })
    resolve(Response.json(soloReply(3, 30)))
    await turn
    expect(game.state.world.currency).toBe(70)
    expect(game.state.quests).toEqual([])
  })
})

it('rejects old HTTP world and quest while still finishing its dialogue', async () => {
  const { turn, resolve } = await deferredTurn()
  acknowledgeWorld({
    type: 'world',
    sequence: 0,
    revision: 5,
    world: { ...initialState().world, currency: 80 },
    quests: [],
    completed: [],
    reputation: 0,
  })
  expect(game.state.dialogue?.thinking).toBe(true)
  resolve(Response.json(soloReply(4, 30)))
  await turn
  expect(game.state.world.currency).toBe(80)
  expect(game.state.quests).toEqual([])
  expect(game.state.dialogue?.thinking).toBe(false)
})
it('does not replace a completed socket party with the active HTTP party', async () => {
  updateNet({ party: oldParty })
  const { turn, resolve } = await deferredTurn()
  const completedParty = {
    ...oldParty,
    members: [{ id: oldParty.id, name: 'New member', color: '#ffeeaa' }],
  }
  handlePartyMessage({ type: 'party', party: completedParty })
  resolve(Response.json(soloReply(1, 30)))
  await turn
  expect(net.state.party).toEqual(completedParty)
})
it('keeps completed reward UI closed when HTTP duplicates a socket completion', async () => {
  const { turn, resolve } = await deferredTurn()
  const world = {
    ...initialState().world,
    currency: 70,
    completedQuestIds: [partyQuest.id],
  }
  handlePartyMessage({
    type: 'quest-completed',
    revision: 3,
    quest: partyQuest,
    quests: [],
    world,
    completed: [summary],
    reputation: 2,
  })
  update({ panel: 'none', rewardQuest: quest })
  resolve(
    Response.json({
      ...reply(),
      revision: 3,
      world,
      questEvents: [
        {
          type: 'completed',
          quest: partyQuest,
          reward: partyQuest.reward,
        },
      ],
    })
  )
  await turn
  expect(game.state.panel).toBe('none')
  expect(game.state.completed).toEqual([summary])
  expect(game.state.reputation).toBe(2)
})
