import { DEMO_QUEST, TEAM_QUEST } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { required, setupParty } from './support/party'

const ctx = setupParty()
const { ask, deliverAll, guest, snapshot, team } = ctx

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
      expect(
        (await ctx.fx.db.player(member.player.id)).world.inventory
      ).toEqual({})
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
        ctx.app.harness.game.checkQuest(member.player.id, 'hoa', TEAM_QUEST.id),
        ctx.app.harness.game.checkQuest(member.player.id, 'hoa', TEAM_QUEST.id),
      ])
    )
    expect(checks.filter((result) => result.rewardGranted)).toHaveLength(1)
    for (const member of members) {
      expect(await ctx.fx.db.player(member.player.id)).toMatchObject({
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
    const rows = await ctx.fx.sql.query<{ player_id: string }>(
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
    let calls = 0
    ctx.live(
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
      { apiKey: 'test-key' }
    )
    const members = await team()
    const first = required(members[0])
    await ctx.app.harness.game.offerQuest(first.player.id, 'hoa', DEMO_QUEST.id)
    await ctx.app.harness.game.offerQuest(first.player.id, 'hoa', TEAM_QUEST.id)
    const assignments = required(snapshot(first)?.quest).assignments
    for (const assignment of assignments)
      await ctx.app.harness.game.applyEvents(
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
    await ctx.app.realtime.party.leave(third.player.id)
    expect(snapshot(third)).toBeNull()
    expect(snapshot(first)?.quest?.assignments.map((a) => a.playerId)).toEqual([
      first.player.id,
      second.player.id,
    ])
    await deliverAll([first, second])
    await ask(second, 'hoa', 'team')
    expect((await ctx.fx.db.player(third.player.id)).world.currency).toBe(30)
    const [a, b] = await team()
    await ask(a, 'hoa', 'team')
    await ctx.app.realtime.party.leave(b.player.id)
    expect(snapshot(a)?.quest ?? null).toBeNull()
    expect((await ask(a, 'hoa', 'team')).questEvent).toBeNull()
    expect((await ctx.fx.db.player(a.player.id)).world.currency).toBe(30)
  })
})
