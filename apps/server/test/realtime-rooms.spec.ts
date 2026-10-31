import { NPC_POSITIONS } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { required, setupRealtime, until } from './support/peer'

const ctx = setupRealtime()

describe('Colyseus street rooms and NPC barks', () => {
  it('places the 21st player in a separate room with isolated presence', async () => {
    const joined = []
    for (let i = 0; i < 21; i++) joined.push(await ctx.guest())
    const first = required(joined[0])
    const twentieth = required(joined[19])
    const last = required(joined[20])
    expect(twentieth.welcome.room).toBe(first.welcome.room)
    await twentieth.peer.waitPlayers((players) => players.length === 20)
    expect(last.welcome.room).not.toBe(first.welcome.room)
    const players = await last.peer.waitPlayers((list) => list.length === 1)
    expect(players.map((p) => p.id)).toEqual([last.player.id])
  })

  it('replaces the old session when the same player joins again', async () => {
    const first = await ctx.guest()
    const replacement = await ctx.open(first.token)
    await replacement.wait('welcome')
    expect(await first.peer.closed).toMatchObject({ code: 4002 })
    replacement.send({
      type: 'state',
      position: [80, 0, 60],
      heading: 2,
      ride: null,
    })
    await replacement.waitPlayers(
      (players) => players.length === 1 && players[0]?.position[0] === 80
    )
    expect(
      ctx.app.realtime.manager.getPlayer(first.player.id)?.position
    ).toEqual([80, 0, 60])
  })

  it('broadcasts nearby fallback NPC lines and respects scheduler cooldown', async () => {
    ctx.app.realtime.manager.stop()
    const first = await ctx.guest()
    const second = await ctx.guest()
    const room = required(ctx.app.realtime.manager.room(first.player.id))
    await ctx.move(first.peer, first.player.id, NPC_POSITIONS.hoa)
    ctx.app.realtime.manager.tick()
    const line = await second.peer.wait('npc-line', (m) => m.npcId === 'hoa')
    expect(line.reply).toContain('Chào bạn!')
    expect(await first.peer.wait('npc-line', (m) => m.npcId === 'hoa')).toEqual(
      line
    )
    room.scheduler.notify('hoa', 'player-nearby')
    expect(await room.scheduler.tick(Date.now() + 1000)).toEqual([])
  })

  it('deduplicates retransmitted spending events across a reconnect', async () => {
    const { peer, token, player } = await ctx.guest()
    const message = {
      type: 'events' as const,
      sequence: 1,
      events: [{ type: 'spend' as const, amount: 5 }],
    }
    peer.send(message)
    expect((await peer.wait('world')).world.currency).toBe(25)
    const replacement = await ctx.open(token)
    await replacement.wait('welcome')
    await peer.closed
    replacement.send(message)
    expect((await replacement.wait('world')).world.currency).toBe(25)
    replacement.send({ ...message, sequence: 2 })
    expect(
      (await replacement.wait('world', (m) => m.sequence === 2)).world.currency
    ).toBe(20)
    expect((await ctx.fx.db.player(player.id)).world.currency).toBe(20)
  })

  it('holds a dropped slot for reconnection and releases it after 60 seconds', async () => {
    ctx.app.realtime.manager.stop()
    const { peer, player } = await ctx.guest()
    const room = required(ctx.app.realtime.manager.room(player.id))
    await peer.drop()
    await until(() =>
      room.members.get(player.id)?.socket === null ? true : undefined
    )
    const disconnectedAt = required(room.members.get(player.id)?.disconnectedAt)
    if (disconnectedAt === null) throw new Error('Missing disconnect timestamp')
    ctx.app.realtime.manager.tick(disconnectedAt + 59_999)
    expect(room.members.has(player.id)).toBe(true)
    ctx.app.realtime.manager.tick(disconnectedAt + 60_000)
    expect(ctx.app.realtime.manager.room(player.id)).toBeUndefined()
  })

  it('caps live room barks and broadcasts fallback after the daily allowance', async () => {
    await ctx.stop()
    let calls = 0
    await ctx.start('test-key', async () => {
      calls++
      return new Response(
        JSON.stringify({
          id: 'bark',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Fresh market morning!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { headers: { 'content-type': 'application/json' } }
      )
    })
    ctx.app.realtime.manager.stop()
    const { peer, player } = await ctx.guest()
    const room = required(ctx.app.realtime.manager.room(player.id))
    await ctx.move(peer, player.id, NPC_POSITIONS.hoa)
    room.scheduler.notify('hoa', 'player-nearby')
    await room.scheduler.tick(Date.now())
    expect((await peer.wait('npc-line', (m) => m.npcId === 'hoa')).reply).toBe(
      'Fresh market morning!'
    )
    await ctx.move(peer, player.id, NPC_POSITIONS.linh)
    room.scheduler.notify('linh', 'player-nearby')
    await room.scheduler.tick(Date.now())
    expect(
      (await peer.wait('npc-line', (m) => m.npcId === 'linh')).reply
    ).toContain('Chào bạn!')
    expect(calls).toBe(1)
    const ledger = await ctx.fx.sql.query<{ barks: number }>(
      'SELECT barks FROM model_spend'
    )
    expect(ledger.rows).toEqual([{ barks: 1 }])
  })
})
