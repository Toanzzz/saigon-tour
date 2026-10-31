import { applyPlayerEvents, type ServerSocketMessage } from '@saigon/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  acknowledgeWorld,
  beginHttpTurn,
  currentEventBatch,
  endHttpTurn,
  eventDiagnostics,
  nextEventBatch,
  resetEventSequence,
} from '../src/net/events'
import { game, initialState, update } from '../src/state/game'

function world(
  sequence: number,
  currency = 25
): Extract<ServerSocketMessage, { type: 'world' }> {
  return {
    type: 'world',
    revision: 0,
    sequence,
    world: { ...initialState().world, currency },
    quest: null,
    completed: [],
    reputation: 0,
  }
}
beforeEach(() => {
  game.setState(() => initialState())
  resetEventSequence()
})
describe('socket event acknowledgement', () => {
  it('applies market purchases at the shared catalog price', () => {
    const bought = applyPlayerEvents(initialState().world, [
      { type: 'purchase', itemId: 'coffee' },
    ])
    expect(bought.currency).toBe(27)
    expect(bought.inventory.coffee).toBe(1)
    const refused = applyPlayerEvents({ ...bought, currency: 2 }, [
      { type: 'purchase', itemId: 'coffee' },
    ])
    expect(refused.currency).toBe(2)
    expect(refused.inventory.coffee).toBe(1)
  })

  it('retains one batch until ack, replays unsent events, and ignores duplicate acks', () => {
    update({ pending: [{ type: 'spend', amount: 5 }] })
    const batch = nextEventBatch()
    if (!batch) throw new Error('expected event batch')
    expect(batch?.sequence).toBeGreaterThan(1000000)
    expect(nextEventBatch()).toBeNull()
    expect(currentEventBatch()).toEqual(batch)
    update({ pending: [{ type: 'spend', amount: 3 }] })
    acknowledgeWorld(world(batch.sequence - 1))
    expect(currentEventBatch()).toEqual(batch)
    acknowledgeWorld(world(batch.sequence))
    expect(currentEventBatch()).toBeNull()
    expect(game.state.world.currency).toBe(22)
    update({ world: { ...game.state.world, currency: 80 } })
    acknowledgeWorld(world(batch.sequence))
    expect(game.state.world.currency).toBe(80)
  })
  it('keeps delivery and all following events for HTTP', () => {
    update({
      pending: [
        { type: 'talk', npcId: 'hoa' },
        { type: 'deliver', npcId: 'linh', itemId: 'herbs' },
        { type: 'spend', amount: 5 },
      ],
    })
    const batch = nextEventBatch()
    if (!batch) throw new Error('expected event batch')
    expect(batch.events).toEqual([{ type: 'talk', npcId: 'hoa' }])
    acknowledgeWorld(world(batch.sequence))
    expect(nextEventBatch()).toBeNull()
    expect(game.state.pending).toHaveLength(2)
  })
  it('blocks HTTP until its in-flight batch is acknowledged and pauses flushing', async () => {
    update({ pending: [{ type: 'spend', amount: 5 }] })
    const batch = nextEventBatch()
    if (!batch) throw new Error('expected event batch')
    let started = false
    const waiting = beginHttpTurn().then((allowed) => {
      started = allowed
    })
    await Promise.resolve()
    expect(started).toBe(false)
    update({ pending: [{ type: 'talk', npcId: 'hoa' }] })
    expect(nextEventBatch()).toBeNull()
    acknowledgeWorld(world(batch.sequence))
    await waiting
    expect(started).toBe(true)
    expect(nextEventBatch()).toBeNull()
    endHttpTurn()
    expect(nextEventBatch()?.events).toEqual([{ type: 'talk', npcId: 'hoa' }])
  })
  it('uses a newer sequence on a guest reset', () => {
    const before = eventDiagnostics().sequence
    resetEventSequence()
    expect(eventDiagnostics().sequence).toBeGreaterThan(before)
  })
  it('a second HTTP turn cannot take or release the active lock', async () => {
    expect(await beginHttpTurn()).toBe(true)
    expect(await beginHttpTurn()).toBe(false)
    update({ pending: [{ type: 'spend', amount: 5 }] })
    expect(nextEventBatch()).toBeNull()
    expect(eventDiagnostics().httpBusy).toBe(true)
    endHttpTurn()
    expect(nextEventBatch()).not.toBeNull()
  })
  it('fences old socket acknowledgements after reset', () => {
    update({ pending: [{ type: 'spend', amount: 5 }] })
    const batch = nextEventBatch()
    if (!batch) throw new Error('expected event batch')
    acknowledgeWorld(world(batch.sequence))
    resetEventSequence()
    update({ world: initialState().world })
    acknowledgeWorld(world(batch.sequence))
    expect(game.state.world.currency).toBe(initialState().world.currency)
  })
})

describe('save revisions and socket sequences', () => {
  it('applies a newer save push during HTTP even with an old event sequence', async () => {
    expect(await beginHttpTurn()).toBe(true)
    update({ pending: [{ type: 'spend', amount: 3 }] })
    acknowledgeWorld({ ...world(0, 70), revision: 4 })
    expect(game.state.world.currency).toBe(67)
    expect(game.state.serverRevision).toBe(4)
    endHttpTurn()
  })
  it('acknowledges an older save without rolling back a newer reward', () => {
    update({ pending: [{ type: 'spend', amount: 5 }] })
    const batch = nextEventBatch()
    if (!batch) throw new Error('expected event batch')
    update({ serverRevision: 5, world: { ...game.state.world, currency: 70 } })
    acknowledgeWorld({ ...world(batch.sequence, 25), revision: 4 })
    expect(currentEventBatch()).toBeNull()
    expect(game.state.world.currency).toBe(70)
    expect(game.state.serverRevision).toBe(5)
  })
  it('replays an unacknowledged batch on a newer unrelated save push', () => {
    update({ pending: [{ type: 'spend', amount: 5 }] })
    const batch = nextEventBatch()
    if (!batch) throw new Error('expected event batch')
    update({ pending: [{ type: 'spend', amount: 3 }] })
    acknowledgeWorld({ ...world(0, 70), revision: 2 })
    expect(currentEventBatch()).toEqual(batch)
    expect(game.state.world.currency).toBe(62)
  })
})
