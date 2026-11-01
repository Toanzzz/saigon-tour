import { describe, expect, it } from 'vitest'
import { Recorder, setupParty } from './support/party'

const ctx = setupParty()
const { guest, invite, join, position, snapshot, team } = ctx

describe('party invitations and membership', () => {
  it('requires the same room, connected peers, and at most eight units at invite and accept', async () => {
    const first = await guest()
    const second = await guest()
    position(second, -7.99)
    await expect(invite(first, second)).rejects.toThrow()
    expect(snapshot(first)).toBeNull()
    position(second, -8)
    const pending = await invite(first, second)
    position(second, -7.99)
    await expect(
      ctx.app.realtime.party.respond(second.player.id, pending.inviteId, true)
    ).rejects.toThrow()
    expect(snapshot(second)).toBeNull()
    position(second, -8)
    await join(first, second)
    expect(snapshot(first)?.members).toHaveLength(2)
    const disconnected = await guest()
    ctx.app.realtime.manager.disconnect(
      disconnected.player.id,
      disconnected.socket
    )
    await expect(invite(first, disconnected)).rejects.toThrow()
    for (let index = 0; index < 17; index++) await guest()
    const otherRoom = await guest()
    expect(ctx.app.realtime.manager.room(otherRoom.player.id)?.id).not.toBe(
      ctx.app.realtime.manager.room(first.player.id)?.id
    )
    await expect(invite(first, otherRoom)).rejects.toThrow()
  })

  it('supports decline, verifies the recipient, and expires invitations at thirty seconds', async () => {
    const [first, second, stranger] = await Promise.all([
      guest(),
      guest(),
      guest(),
    ])
    const pending = await invite(first, second)
    expect(second.socket.messages).toContainEqual({
      type: 'party-invited',
      ...pending,
    })
    await expect(
      ctx.app.realtime.party.respond(stranger.player.id, pending.inviteId, true)
    ).rejects.toThrow()
    await ctx.app.realtime.party.respond(
      second.player.id,
      pending.inviteId,
      false
    )
    expect(snapshot(first)).toBeNull()
    expect(snapshot(second)).toBeNull()
    await expect(
      ctx.app.realtime.party.respond(second.player.id, pending.inviteId, true)
    ).rejects.toThrow()
    const expired = await invite(first, second)
    ctx.advance(30_000)
    ctx.app.realtime.party.tick(ctx.now)
    await expect(
      ctx.app.realtime.party.respond(second.player.id, expired.inviteId, true)
    ).rejects.toThrow()
    const fresh = await invite(first, second)
    ctx.advance(29_999)
    await ctx.app.realtime.party.respond(second.player.id, fresh.inviteId, true)
    expect(snapshot(second)?.members.map((p) => p.id)).toEqual([
      first.player.id,
      second.player.id,
    ])
  })

  it('rechecks capacity and existing memberships when accepting pending invites', async () => {
    const [first, second] = await team()
    const third = await guest()
    const fourth = await guest()
    const fifth = await guest()
    const stale = await invite(first, fifth)
    await join(first, third)
    await join(second, fourth)
    await expect(
      ctx.app.realtime.party.respond(fifth.player.id, stale.inviteId, true)
    ).rejects.toThrow()
    await expect(invite(first, fifth)).rejects.toThrow()
    expect(snapshot(first)?.members).toHaveLength(4)
    expect(snapshot(fifth)).toBeNull()
    const outsider = await guest()
    await expect(invite(outsider, third)).rejects.toThrow()
    await ctx.app.realtime.party.leave(fourth.player.id)
    await join(fifth, fourth)
    expect(snapshot(fourth)?.members.map((p) => p.id)).toEqual([
      fifth.player.id,
      fourth.player.id,
    ])
    expect(snapshot(first)?.members).toHaveLength(3)
  })

  it('pushes membership updates and clears reset membership while preserving guest identity', async () => {
    const [first, second] = await team()
    for (const member of [first, second])
      expect(member.socket.messages).toContainEqual({
        type: 'party',
        party: snapshot(first),
      })
    expect(snapshot(first)?.members).toHaveLength(2)
    first.socket.clear()
    second.socket.clear()
    const response = await ctx.app.request('/me/reset', {
      method: 'POST',
      headers: { Authorization: `Bearer ${second.token}` },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      player: {
        id: second.player.id,
        name: second.player.name,
        world: { currency: 30 },
      },
    })
    await expect.poll(() => snapshot(second)).toBeNull()
    expect(ctx.app.realtime.manager.room(second.player.id)).toBeUndefined()
    expect(second.socket.closed).toBe(4003)
    await expect.poll(() => snapshot(first)).toBeNull()
    expect(
      first.socket.messages.some(
        (message) => message.type === 'party' && message.party === null
      )
    ).toBe(true)
  })

  it('retains a disconnected party for sixty seconds, restores its snapshot, and cancels on expiry', async () => {
    const [first, second] = await team()
    ctx.app.realtime.manager.disconnect(second.player.id, second.socket)
    ctx.advance(59_999)
    ctx.app.realtime.manager.tick(ctx.now)
    expect(snapshot(second)?.members).toHaveLength(2)
    const replacement = new Recorder()
    ctx.app.realtime.manager.connect(second.player, replacement)
    ctx.app.realtime.party.connected(second.player.id)
    expect(replacement.messages).toContainEqual({
      type: 'party',
      party: snapshot(first),
    })
    ctx.app.realtime.manager.disconnect(second.player.id, replacement)
    ctx.advance(60_000)
    ctx.app.realtime.manager.tick(ctx.now)
    await expect.poll(() => snapshot(second)).toBeNull()
    await expect.poll(() => snapshot(first)).toBeNull()
  })

  it('rechecks connection and target membership after an invitation is sent', async () => {
    const [first, second, third] = await Promise.all([
      guest(),
      guest(),
      guest(),
    ])
    const pending = await invite(first, second)
    await join(third, second)
    await expect(
      ctx.app.realtime.party.respond(second.player.id, pending.inviteId, true)
    ).rejects.toThrow()
    expect(snapshot(first)).toBeNull()
    await ctx.app.realtime.party.leave(second.player.id)
    const moved = await invite(first, second)
    ctx.app.realtime.manager.disconnect(second.player.id, second.socket)
    await expect(
      ctx.app.realtime.party.respond(second.player.id, moved.inviteId, true)
    ).rejects.toThrow()
    expect(snapshot(first)).toBeNull()
  })
})
