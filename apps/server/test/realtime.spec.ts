import { describe, expect, it } from 'vitest'
import { setupRealtime } from './support/peer'

const ctx = setupRealtime()

describe('Colyseus world room transport', () => {
  it('rejects an untrusted origin before upgrading', async () => {
    const { token } = await ctx.fx.guest()
    await expect(ctx.open(token, 'https://untrusted.test')).rejects.toThrow()
    expect(ctx.app.realtime.manager.rooms.size).toBe(0)
  })

  it('rejects missing and invalid Better Auth sessions at matchmaking', async () => {
    await expect(ctx.open()).rejects.toThrow()
    await expect(ctx.open('invalid-token')).rejects.toThrow()
    expect(ctx.app.realtime.manager.rooms.size).toBe(0)
  })

  it('syncs presence state, emotes, and disconnects', async () => {
    const first = await ctx.guest()
    const second = await ctx.guest()
    expect(first.welcome.selfId).toBe(first.player.id)
    expect(second.welcome.room).toBe(first.welcome.room)
    await first.peer.waitPlayers((players) => players.length === 2)
    first.peer.send({
      type: 'state',
      position: [50, 0, 50],
      heading: 1.2,
      ride: 'bus',
    })
    const players = await second.peer.waitPlayers((list) =>
      list.some((p) => p.id === first.player.id && p.position[0] === 50)
    )
    expect(players.find((p) => p.id === first.player.id)).toMatchObject({
      name: first.player.name,
      color: first.player.color,
      position: [50, 0, 50],
      ride: 'bus',
    })
    expect(players.find((p) => p.id === first.player.id)?.heading).toBeCloseTo(
      1.2
    )
    first.peer.send({ type: 'emote', emote: 'wave' })
    expect(await second.peer.wait('emote')).toMatchObject({
      playerId: first.player.id,
      emote: 'wave',
    })
    await first.peer.room.leave()
    await second.peer.waitPlayers((list) => list.length === 1)
  })

  it.each(['state', 'emote'] as const)(
    'closes excessive %s traffic',
    async (type) => {
      const { peer } = await ctx.guest()
      for (let i = 0; i < (type === 'state' ? 16 : 2); i++)
        peer.send(
          type === 'state'
            ? { type, position: [50, 0, 50], heading: i, ride: null }
            : { type, emote: 'wave' }
        )
      expect(await peer.closed).toMatchObject({ code: 4008 })
    }
  )

  it('tolerates a jittered 10 Hz sender inside one window', async () => {
    const { peer } = await ctx.guest()
    let closed = false
    void peer.closed.then(() => {
      closed = true
    })
    for (let i = 0; i < 12; i++)
      peer.send({
        type: 'state',
        position: [50, 0, 50],
        heading: i,
        ride: null,
      })
    peer.send({ type: 'emote', emote: 'hello' })
    await peer.wait('emote')
    expect(closed).toBe(false)
  })

  it('rejects out-of-bounds positions and malformed messages', async () => {
    const first = await ctx.guest()
    first.peer.send({
      type: 'state',
      position: [999, 0, 0],
      heading: 0,
      ride: null,
    })
    expect((await first.peer.closed).code).toBe(4008)
    const second = await ctx.guest()
    second.peer.sendRaw('events', { sequence: 'x' })
    expect((await second.peer.closed).code).toBe(4008)
  })

  it('reports the renamed player in synced presence', async () => {
    const { peer, player, token } = await ctx.guest()
    const response = await ctx.app.request('/me/profile', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Chị Hạnh' }),
    })
    expect(response.status).toBe(200)
    const players = await peer.waitPlayers((list) =>
      list.some((p) => p.id === player.id && p.name === 'Chị Hạnh')
    )
    expect(players).toHaveLength(1)
  })
})
