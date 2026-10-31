import { describe, expect, it } from 'vitest'
import { Peer, setupRealtime } from './support/peer'

const ctx = setupRealtime()

describe('real Node WebSocket transport', () => {
  it('rejects an untrusted origin before upgrading', async () => {
    const peer = new Peer(ctx.url, 'https://untrusted.test')
    const status = await new Promise<number | undefined>((resolve) =>
      peer.socket.once('unexpected-response', (_request, response) => {
        response.resume()
        peer.socket.terminate()
        resolve(response.statusCode)
      })
    )
    expect(status).toBe(403)
    expect(ctx.app.realtime.manager.rooms.size).toBe(0)
  })

  it('rejects bad tokens and unauthenticated state messages', async () => {
    const bad = await ctx.open('invalid-token')
    expect(await bad.closed).toMatchObject({
      code: 1008,
      reason: 'unauthorized',
    })
    const missing = await ctx.open()
    missing.send({ type: 'state', position: [0, 0, 0], heading: 0, ride: null })
    expect(await missing.closed).toMatchObject({
      code: 1008,
      reason: 'hello_required',
    })
    expect(ctx.app.realtime.manager.rooms.size).toBe(0)
  })

  it('closes a connection that never sends hello', async () => {
    const peer = await ctx.open()
    expect(await peer.closed).toMatchObject({
      code: 1008,
      reason: 'hello_timeout',
    })
  }, 7000)

  it('broadcasts joins, snapshots, state, emotes, and disconnects', async () => {
    const first = await ctx.guest()
    const second = await ctx.guest()
    expect(first.welcome.selfId).toBe(first.player.id)
    expect(second.welcome.room).toBe(first.welcome.room)
    expect(second.welcome.players).toHaveLength(2)
    expect(await first.peer.wait('player-joined')).toMatchObject({
      player: { id: second.player.id },
    })
    first.peer.send({
      type: 'state',
      position: [50, 0, 50],
      heading: 1.2,
      ride: 'bus',
    })
    const snapshot = await second.peer.wait('players', (m) =>
      m.players.some((p) => p.id === first.player.id && p.position[0] === 50)
    )
    expect(
      snapshot.players.find((p) => p.id === first.player.id)
    ).toMatchObject({
      name: first.player.name,
      color: first.player.color,
      position: [50, 0, 50],
      heading: 1.2,
      ride: 'bus',
    })
    first.peer.send({ type: 'emote', emote: 'wave' })
    expect(await second.peer.wait('emote')).toMatchObject({
      playerId: first.player.id,
      emote: 'wave',
    })
    first.peer.socket.close()
    expect(await second.peer.wait('player-left')).toMatchObject({
      playerId: first.player.id,
    })
  })

  it.each(['state', 'emote'] as const)(
    'closes excessive %s traffic',
    async (type) => {
      const { peer } = await ctx.guest()
      for (let i = 0; i < (type === 'state' ? 11 : 2); i++)
        peer.send(
          type === 'state'
            ? { type, position: [50, 0, 50], heading: i, ride: null }
            : { type, emote: 'wave' }
        )
      expect(await peer.closed).toMatchObject({
        code: 1008,
        reason: 'rate_limit',
      })
    }
  )

  it('rejects out-of-bounds positions and oversized messages', async () => {
    const first = await ctx.guest()
    first.peer.socket.send(
      JSON.stringify({
        type: 'state',
        position: [999, 0, 0],
        heading: 0,
        ride: null,
      })
    )
    expect((await first.peer.closed).code).toBe(1008)
    const second = await ctx.guest()
    second.peer.socket.send('x'.repeat(4097))
    expect((await second.peer.closed).code).toBe(1009)
  })
})
