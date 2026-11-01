import { matchMaker } from '@colyseus/core'
import { describe, expect, it } from 'vitest'
import { required, setupRealtime } from './support/peer'

const ctx = setupRealtime()
describe('Colyseus incremental presence patches', () => {
  it('updates the first client when a second client joins and moves', async () => {
    const first = await ctx.guest()
    await first.peer.waitPlayers((players) => players.length === 1)
    const second = await ctx.guest()
    await first.peer.waitPlayers((players) =>
      players.some((player) => player.id === second.player.id)
    )
    expect(first.peer.players).toHaveLength(2)
    second.peer.send({
      type: 'state',
      position: [41, 0, 35],
      heading: 0.5,
      ride: null,
    })
    await first.peer.waitPlayers((players) =>
      players.some(
        (player) => player.id === second.player.id && player.position[0] === 41
      )
    )
    expect(
      first.peer.players.find((player) => player.id === second.player.id)
        ?.position
    ).toEqual([41, 0, 35])
  })

  it('isolates the automatic patch timer from explicit patch delivery', async () => {
    const first = await ctx.guest()
    await first.peer.waitPlayers((players) => players.length === 1)
    const room = required(matchMaker.getLocalRoomById(first.peer.room.roomId))
    room.patchRate = null
    const second = await ctx.guest()
    await second.peer.waitPlayers((players) => players.length === 2)
    expect(first.peer.players).toHaveLength(1)
    expect(room.broadcastPatch()).toBe(true)
    await first.peer.waitPlayers((players) => players.length === 2)
    expect(first.peer.players.map((player) => player.id)).toContain(
      second.player.id
    )
    room.patchRate = 50
  })
})
