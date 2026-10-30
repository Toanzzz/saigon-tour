import { once } from 'node:events'
import { serve } from '@hono/node-server'
import {
  DEMO_QUEST,
  type GuestPlayer,
  type InteractRequest,
  InteractResponseSchema,
  type NpcId,
  type PlayerEvent,
  type ServerSocketMessage,
  ServerSocketMessageSchema,
  TEAM_QUEST,
} from '@saigon/shared'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import { WebSocket } from 'ws'
import { createApp } from '../src/app'
import { readConfig } from '../src/config'
import type { RoomSocket } from '../src/realtime'
import { fixture } from './fixture'

class Recorder implements RoomSocket {
  messages: ServerSocketMessage[] = []
  closed: number | undefined
  send(data: string) {
    this.messages.push(ServerSocketMessageSchema.parse(JSON.parse(data)))
  }
  close(code?: number) {
    this.closed = code
  }
  clear() {
    this.messages.length = 0
  }
}
type Guest = { player: GuestPlayer; token: string; socket: Recorder }
let fx: Awaited<ReturnType<typeof fixture>>
let app: ReturnType<typeof createApp>
let now: number
beforeAll(async () => {
  fx = await fixture()
})
beforeEach(() => {
  now = Date.parse('2026-10-31T10:00:00Z')
  app = createApp({ ...readConfig({}), production: true }, fetch, {
    ...fx,
    now: () => now,
  })
  app.realtime.manager.stop()
})
afterEach(() => app.realtime.shutdown())
afterAll(() => fx.close())

async function guest(): Promise<Guest> {
  const identity = await fx.db.createGuest()
  const socket = new Recorder()
  app.realtime.manager.connect(identity.player, socket)
  return { ...identity, socket }
}
async function invite(from: Guest, to: Guest) {
  return app.realtime.party.invite(from.player.id, to.player.id)
}
async function join(from: Guest, to: Guest) {
  const invitation = await invite(from, to)
  return app.realtime.party.respond(to.player.id, invitation.inviteId, true)
}
function snapshot(player: Guest) {
  return app.realtime.party.snapshot(player.player.id)
}
function position(player: Guest, x: number) {
  const presence = app.realtime.manager.getPlayer(player.player.id)
  if (!presence) throw new Error('Missing presence')
  presence.position = [x, 0, 8]
}
async function ask(
  player: Guest,
  npcId: NpcId,
  intent: InteractRequest['intent'] = 'chat',
  events: PlayerEvent[] = []
) {
  const response = await app.request(`/npc/${npcId}/interact`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${player.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Help with the team lunch',
      intent,
      events,
      worldContext: {
        playerLocation: npcId === 'linh' ? 'park' : 'market',
        nearbyNpcs: [npcId],
        timeOfDay: 'morning',
      },
    }),
  })
  expect(response.status).toBe(200)
  return InteractResponseSchema.parse(await response.json())
}
async function team(size = 2) {
  const leader = await guest()
  const members = [leader]
  for (let index = 1; index < size; index++) {
    const member = await guest()
    await join(leader, member)
    members.push(member)
  }
  return members
}
function required<T>(value: T | undefined | null): T {
  if (value == null) throw new Error('Missing test entity')
  return value
}
async function deliverAll(members: Guest[]) {
  const assignments = required(
    snapshot(required(members[0]))?.quest
  ).assignments
  for (const member of members) {
    const assignment = required(
      assignments.find((a) => a.playerId === member.player.id)
    )
    await ask(member, 'linh', 'chat', [
      { type: 'deliver', npcId: 'linh', itemId: assignment.dish },
    ])
  }
}

describe('party invitations and membership', () => {
  it('routes authenticated invite, accept, and leave messages through real Node sockets', async () => {
    const server = serve({
      fetch: app.fetch,
      port: 0,
      hostname: '127.0.0.1',
      websocket: { server: app.realtime.server },
    })
    const sockets: WebSocket[] = []
    try {
      if (!server.listening) await once(server, 'listening')
      const address = server.address()
      if (!address || typeof address === 'string')
        throw new Error('Missing port')
      const connect = async () => {
        const identity = await fx.db.createGuest()
        const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws`, {
          origin: 'http://localhost:58000',
        })
        sockets.push(socket)
        const recorder = new Recorder()
        socket.on('message', (data) => recorder.send(String(data)))
        await once(socket, 'open')
        socket.send(
          JSON.stringify({ type: 'hello', token: identity.token, protocol: 1 })
        )
        await expect
          .poll(() => recorder.messages.some((m) => m.type === 'welcome'))
          .toBe(true)
        return { ...identity, socket, recorder }
      }
      const first = await connect()
      const second = await connect()
      first.socket.send(
        JSON.stringify({ type: 'party-invite', targetId: second.player.id })
      )
      await expect
        .poll(() =>
          second.recorder.messages.some((m) => m.type === 'party-invited')
        )
        .toBe(true)
      const invitation = required(
        second.recorder.messages.find((m) => m.type === 'party-invited')
      )
      if (invitation.type !== 'party-invited') throw new Error('Missing invite')
      second.socket.send(
        JSON.stringify({
          type: 'party-respond',
          inviteId: invitation.inviteId,
          accept: true,
        })
      )
      for (const peer of [first, second])
        await expect
          .poll(() =>
            peer.recorder.messages.some(
              (m) => m.type === 'party' && m.party?.members.length === 2
            )
          )
          .toBe(true)
      first.recorder.clear()
      second.recorder.clear()
      second.socket.send(JSON.stringify({ type: 'party-leave' }))
      for (const peer of [first, second])
        await expect
          .poll(() =>
            peer.recorder.messages.some(
              (m) => m.type === 'party' && m.party === null
            )
          )
          .toBe(true)
    } finally {
      await Promise.all(
        sockets.map(async (socket) => {
          if (socket.readyState === WebSocket.CLOSED) return
          const closed = once(socket, 'close')
          socket.terminate()
          await closed
        })
      )
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
    }
  })

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
      app.realtime.party.respond(second.player.id, pending.inviteId, true)
    ).rejects.toThrow()
    expect(snapshot(second)).toBeNull()
    position(second, -8)
    await join(first, second)
    expect(snapshot(first)?.members).toHaveLength(2)
    const disconnected = await guest()
    app.realtime.manager.disconnect(disconnected.player.id, disconnected.socket)
    await expect(invite(first, disconnected)).rejects.toThrow()
    for (let index = 0; index < 17; index++) await guest()
    const otherRoom = await guest()
    expect(app.realtime.manager.room(otherRoom.player.id)?.id).not.toBe(
      app.realtime.manager.room(first.player.id)?.id
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
      app.realtime.party.respond(stranger.player.id, pending.inviteId, true)
    ).rejects.toThrow()
    await app.realtime.party.respond(second.player.id, pending.inviteId, false)
    expect(snapshot(first)).toBeNull()
    expect(snapshot(second)).toBeNull()
    await expect(
      app.realtime.party.respond(second.player.id, pending.inviteId, true)
    ).rejects.toThrow()
    const expired = await invite(first, second)
    now += 30_000
    app.realtime.party.tick(now)
    await expect(
      app.realtime.party.respond(second.player.id, expired.inviteId, true)
    ).rejects.toThrow()
    const fresh = await invite(first, second)
    now += 29_999
    await app.realtime.party.respond(second.player.id, fresh.inviteId, true)
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
      app.realtime.party.respond(fifth.player.id, stale.inviteId, true)
    ).rejects.toThrow()
    await expect(invite(first, fifth)).rejects.toThrow()
    expect(snapshot(first)?.members).toHaveLength(4)
    expect(snapshot(fifth)).toBeNull()
    const outsider = await guest()
    await expect(invite(outsider, third)).rejects.toThrow()
    await app.realtime.party.leave(fourth.player.id)
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
    await ask(first, 'hoa', 'team')
    expect(snapshot(first)?.quest?.assignments).toHaveLength(2)
    first.socket.clear()
    second.socket.clear()
    const response = await app.request('/me/reset', {
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
    expect(app.realtime.manager.room(second.player.id)).toBeUndefined()
    expect(second.socket.closed).toBe(1000)
    await expect.poll(() => snapshot(first)?.quest ?? null).toBeNull()
    expect(
      first.socket.messages.some(
        (message) => message.type === 'party' && !message.party?.quest
      )
    ).toBe(true)
  })

  it('retains a disconnected party for sixty seconds, restores its snapshot, and cancels on expiry', async () => {
    const [first, second] = await team()
    await ask(first, 'hoa', 'team')
    app.realtime.manager.disconnect(second.player.id, second.socket)
    now += 59_999
    app.realtime.manager.tick(now)
    expect(snapshot(second)?.quest?.assignments).toHaveLength(2)
    const replacement = new Recorder()
    app.realtime.manager.connect(second.player, replacement)
    app.realtime.party.connected(second.player.id)
    expect(replacement.messages).toContainEqual({
      type: 'party',
      party: snapshot(first),
    })
    app.realtime.manager.disconnect(second.player.id, replacement)
    now += 60_000
    app.realtime.manager.tick(now)
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
      app.realtime.party.respond(second.player.id, pending.inviteId, true)
    ).rejects.toThrow()
    expect(snapshot(first)).toBeNull()
    await app.realtime.party.leave(second.player.id)
    const moved = await invite(first, second)
    app.realtime.manager.disconnect(second.player.id, second.socket)
    await expect(
      app.realtime.party.respond(second.player.id, moved.inviteId, true)
    ).rejects.toThrow()
    expect(snapshot(first)).toBeNull()
  })
})

describe('authoritative team lunch errand', () => {
  it('requires two party members and assigns dishes in party join order outside saved inventory', async () => {
    const solo = await guest()
    expect((await ask(solo, 'hoa', 'team')).questEvent).toBeNull()
    const members = await team(4)
    const result = await ask(required(members[2]), 'hoa', 'team')
    expect(result.questEvent).toMatchObject({
      type: 'offered',
      quest: TEAM_QUEST,
    })
    expect(result.toolCalls).toContain('offer-quest')
    expect(result.party?.quest?.assignments).toEqual(
      members.map((member, index) => ({
        playerId: member.player.id,
        name: member.player.name,
        dish: ['noodles', 'broth', 'baguette', 'coffee'][index],
        delivered: false,
      }))
    )
    for (const member of members) {
      expect((await fx.db.player(member.player.id)).world.inventory).toEqual({})
      expect(snapshot(member)).toEqual(result.party)
    }
  })

  it('rejects another member’s dish, a wrong recipient, and delivery through the wrong NPC', async () => {
    const [first, second] = await team()
    await ask(first, 'hoa', 'team')
    await ask(first, 'linh', 'chat', [
      { type: 'deliver', itemId: 'broth', npcId: 'linh' },
    ])
    await ask(first, 'tam', 'chat', [
      { type: 'deliver', itemId: 'noodles', npcId: 'linh' },
    ])
    await ask(first, 'linh', 'chat', [
      { type: 'deliver', itemId: 'noodles', npcId: 'tam' },
    ])
    expect(snapshot(first)?.quest?.assignments.every((a) => !a.delivered)).toBe(
      true
    )
    expect((await ask(first, 'hoa', 'team')).questEvent?.type).toBe(
      'incomplete'
    )
    const delivered = await ask(first, 'linh', 'chat', [
      { type: 'deliver', itemId: 'noodles', npcId: 'linh' },
    ])
    expect(delivered.party?.quest?.assignments.map((a) => a.delivered)).toEqual(
      [true, false]
    )
    expect(second.socket.messages).toContainEqual({
      type: 'party',
      party: delivered.party,
    })
    expect((await ask(second, 'hoa', 'team')).world.currency).toBe(30)
  })

  it('rewards all assigned members once under concurrent checks and pushes canonical completion', async () => {
    const members = await team(4)
    const first = required(members[0])
    await ask(first, 'hoa', 'team')
    await deliverAll(members)
    for (const member of members) member.socket.clear()
    const checks = await Promise.all(
      members.flatMap((member) => [
        app.harness.game.checkQuest(member.player.id, 'hoa', TEAM_QUEST.id),
        app.harness.game.checkQuest(member.player.id, 'hoa', TEAM_QUEST.id),
      ])
    )
    expect(checks.filter((result) => result.rewardGranted)).toHaveLength(1)
    for (const member of members) {
      expect(await fx.db.player(member.player.id)).toMatchObject({
        world: {
          currency: 70,
          inventory: { photo: 1 },
          completedQuestIds: [TEAM_QUEST.id],
        },
        reputation: 2,
        completed: [TEAM_QUEST],
      })
      expect(
        member.socket.messages.filter((m) => m.type === 'quest-completed')
      ).toEqual([
        expect.objectContaining({
          type: 'quest-completed',
          quest: TEAM_QUEST,
          world: expect.objectContaining({ currency: 70 }),
          reputation: 2,
        }),
      ])
      expect(
        member.socket.messages.some(
          (m) => m.type === 'world' && m.world.currency === 70
        )
      ).toBe(true)
    }
    const rows = await fx.sql.query<{ player_id: string }>(
      'SELECT player_id FROM quest_completions WHERE quest_id=$1 AND player_id=ANY($2::uuid[])',
      [TEAM_QUEST.id, members.map((m) => m.player.id)]
    )
    expect(rows.rows).toHaveLength(4)
    expect((await ask(first, 'hoa', 'team')).questEvent).toBeNull()
    expect((await ask(first, 'hoa', 'team')).world.currency).toBe(70)
  })

  it('returns the canonical team quest in HTTP check completion and blocks repeat payouts', async () => {
    const members = await team()
    const first = required(members[0])
    await ask(first, 'hoa', 'team')
    await deliverAll(members)
    const result = await ask(first, 'hoa', 'team')
    expect(result.questEvent).toEqual({
      type: 'completed',
      quest: TEAM_QUEST,
      reward: TEAM_QUEST.reward,
    })
    expect(result.toolCalls).toContain('check-quest')
    expect(result.party?.quest?.completed).toBe(true)
    expect(
      (await ask(required(members[1]), 'hoa', 'team')).world.currency
    ).toBe(70)
  })

  it('returns the canonical team quest from the model tool while preserving the solo errand', async () => {
    app.realtime.shutdown()
    let calls = 0
    app = createApp(
      { ...readConfig({}), production: true, apiKey: 'test-key' },
      async () => {
        const tool = calls++ === 0
        return Response.json({
          id: `party-${calls}`,
          choices: [
            {
              index: 0,
              finish_reason: tool ? 'tool_calls' : 'stop',
              message: tool
                ? {
                    role: 'assistant',
                    content: '',
                    tool_calls: [
                      {
                        id: 'team-check',
                        type: 'function',
                        function: {
                          name: 'checkQuest',
                          arguments: JSON.stringify({ questId: TEAM_QUEST.id }),
                        },
                      },
                    ],
                  }
                : {
                    role: 'assistant',
                    content: 'Cảm ơn, the team lunch is here!',
                  },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10 },
        })
      },
      { ...fx, now: () => now }
    )
    app.realtime.manager.stop()
    const members = await team()
    const first = required(members[0])
    await app.harness.game.offerQuest(first.player.id, 'hoa', DEMO_QUEST.id)
    await app.harness.game.offerQuest(first.player.id, 'hoa', TEAM_QUEST.id)
    const assignments = required(snapshot(first)?.quest).assignments
    for (const assignment of assignments)
      await app.harness.game.applyEvents(
        assignment.playerId,
        [
          {
            type: 'deliver',
            npcId: 'linh',
            itemId: assignment.dish,
          },
        ],
        'linh'
      )
    const result = await ask(first, 'hoa')
    expect(result.questEvent).toEqual({
      type: 'completed',
      quest: TEAM_QUEST,
      reward: TEAM_QUEST.reward,
    })
    expect(result.quest).toEqual(DEMO_QUEST)
    expect(result.world.inventory).toEqual({ herbs: 1, photo: 1 })
    expect(result.source).toBe('live')
    expect(calls).toBe(2)
  })

  it('removes departed assignments, pays remaining members only, and cancels below two', async () => {
    const [first, second, third] = await team(3)
    await ask(first, 'hoa', 'team')
    await app.realtime.party.leave(third.player.id)
    expect(snapshot(third)).toBeNull()
    expect(snapshot(first)?.quest?.assignments.map((a) => a.playerId)).toEqual([
      first.player.id,
      second.player.id,
    ])
    await deliverAll([first, second])
    await ask(second, 'hoa', 'team')
    expect((await fx.db.player(third.player.id)).world.currency).toBe(30)
    const [a, b] = await team()
    await ask(a, 'hoa', 'team')
    await app.realtime.party.leave(b.player.id)
    expect(snapshot(a)?.quest ?? null).toBeNull()
    expect((await ask(a, 'hoa', 'team')).questEvent).toBeNull()
    expect((await fx.db.player(a.player.id)).world.currency).toBe(30)
  })
})
