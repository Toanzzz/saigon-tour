import {
  CHAT_COOLDOWN_MS,
  canOfferQuests,
  friendlinessOf,
  NPCS,
  seedsFor,
  shiftFriendship,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { ask, live, offline, required, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()
describe('friendship', () => {
  it('starts from presets and clamps both bounds', () => {
    for (const npc of Object.values(NPCS)) {
      expect(friendlinessOf({}, npc.id)).toBe(npc.friendliness)
      expect(friendlinessOf(shiftFriendship({}, npc.id, 20), npc.id)).toBe(5)
      expect(friendlinessOf(shiftFriendship({}, npc.id, -20), npc.id)).toBe(-5)
    }
    expect(canOfferQuests({ hoa: { level: -3 } }, 'hoa')).toBe(false)
  })
  it('enforces cooldown and chat cap without blocking cooling down', async () => {
    const game = ctx.fx.harness(offline).game
    expect(
      (await game.adjustFriendship(ctx.playerId, 'hoa', 'warmer', 0))?.level
    ).toBe(2)
    expect(
      await game.adjustFriendship(ctx.playerId, 'hoa', 'warmer', 1)
    ).toBeNull()
    expect(
      (
        await game.adjustFriendship(
          ctx.playerId,
          'hoa',
          'warmer',
          CHAT_COOLDOWN_MS
        )
      )?.level
    ).toBe(3)
    expect(
      await game.adjustFriendship(
        ctx.playerId,
        'hoa',
        'warmer',
        CHAT_COOLDOWN_MS * 2
      )
    ).toBeNull()
    expect(
      (
        await game.adjustFriendship(
          ctx.playerId,
          'hoa',
          'cooler',
          CHAT_COOLDOWN_MS * 2
        )
      )?.level
    ).toBe(2)
  })
  it('gates offers server-side and resets friendship', async () => {
    const game = ctx.fx.harness(offline).game
    await ctx.fx.db.mutatePlayer(ctx.playerId, (save) => {
      save.friendship = { hoa: { level: -3 } }
    })
    expect(
      await game.proposeQuest(ctx.playerId, 'hoa', required(seedsFor('hoa')[0]))
    ).toEqual({ accepted: false, reason: 'friendliness_too_low' })
    await ctx.fx.db.reset(ctx.playerId)
    expect((await game.get(ctx.playerId)).friendship).toEqual({})
  })
  it('records at most one adjustment tool per turn, even if cooldown is changed', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([
        {
          tool: [
            'adjustFriendliness',
            { direction: 'warmer', reason: 'A thoughtful gesture' },
          ],
        },
        {
          tool: [
            'adjustFriendliness',
            { direction: 'warmer', reason: 'Again' },
          ],
        },
        { text: 'Thank you!' },
      ])
    )
    const result = await harness.interact(
      'hoa',
      ask('You make our neighborhood brighter.'),
      ctx.playerId
    )
    expect(friendlinessOf(result.friendship, 'hoa')).toBe(2)
    expect(
      result.toolCalls.filter((call) => call === 'adjust-friendliness')
    ).toHaveLength(1)
  })
  it.each(['help', 'check'] as const)(
    'accepts legacy %s as chat',
    async (intent) => {
      const result = await ctx.fx
        .harness(offline)
        .interact('hoa', ask('Any errands?', { intent }), ctx.playerId)
      expect(result.questEvents.some((event) => event.type === 'offered')).toBe(
        true
      )
    }
  )
})
