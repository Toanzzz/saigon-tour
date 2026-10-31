import { describe, expect, it } from 'vitest'
import { required, setupRealtime } from './support/peer'

const ctx = setupRealtime()

describe('party messages over Colyseus', () => {
  it('routes authenticated invite, accept, and leave through real room clients', async () => {
    const first = await ctx.guest()
    const second = await ctx.guest()
    first.peer.send({ type: 'party-invite', targetId: second.player.id })
    const invitation = await second.peer.wait('party-invited')
    second.peer.send({
      type: 'party-respond',
      inviteId: invitation.inviteId,
      accept: true,
    })
    for (const peer of [first.peer, second.peer])
      await peer.wait('party', (m) => m.party?.members.length === 2)
    first.peer.messages.length = 0
    second.peer.messages.length = 0
    second.peer.send({ type: 'party-leave' })
    for (const peer of [first.peer, second.peer])
      expect(await peer.wait('party', (m) => m.party === null)).toMatchObject({
        party: null,
      })
  })

  it('reports invalid party actions as errors without closing the room', async () => {
    const first = await ctx.guest()
    first.peer.send({ type: 'party-invite', targetId: first.player.id })
    expect((await first.peer.wait('error')).message).toBe('cannot_invite_self')
    first.peer.send({ type: 'emote', emote: 'hello' })
    expect(required(await first.peer.wait('emote')).playerId).toBe(
      first.player.id
    )
  })
})
