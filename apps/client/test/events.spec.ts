import type { ServerSocketMessage } from '@saigon/shared'
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
})
