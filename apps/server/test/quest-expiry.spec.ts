import { friendlinessOf, QUEST_EXPIRY_MS } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { hoaDelivery, offline, setupNpc } from './support/npc'

const ctx = setupNpc()
describe('quest failure', () => {
  it('expires active quests, reclaims unused deliveries, penalizes once', async () => {
    const game = ctx.fx.harness(offline).game
    const offer = await game.proposeQuest(ctx.playerId, 'hoa', hoaDelivery())
    if (!offer.accepted) throw new Error(offer.reason)
    const now = offer.quest.createdAt + QUEST_EXPIRY_MS
    const save = await game.expire(ctx.playerId, now)
    expect(save.quests).toEqual([])
    expect(save.world.inventory.broth).toBe(0)
    expect(friendlinessOf(save.friendship, 'hoa')).toBe(0)
    expect(
      friendlinessOf((await game.expire(ctx.playerId, now)).friendship, 'hoa')
    ).toBe(0)
  })
  it('never expires ready quests', async () => {
    const game = ctx.fx.harness(offline).game
    await game.proposeQuest(ctx.playerId, 'hoa', hoaDelivery())
    await game.applyEvents(ctx.playerId, [
      { type: 'deliver', itemId: 'broth', npcId: 'linh' },
    ])
    expect(
      (await game.expire(ctx.playerId, Date.now() + QUEST_EXPIRY_MS)).quests[0]
        ?.status
    ).toBe('ready')
  })
  it('checks decline ownership and progress; abandonment penalizes', async () => {
    const game = ctx.fx.harness(offline).game
    const offer = await game.proposeQuest(ctx.playerId, 'hoa', hoaDelivery())
    if (!offer.accepted) throw new Error(offer.reason)
    expect(
      (await game.fail(ctx.playerId, offer.quest.id, 'declined', 'tam')).quests
    ).toHaveLength(1)
    const declined = await game.fail(
      ctx.playerId,
      offer.quest.id,
      'declined',
      'hoa'
    )
    expect(declined.quests).toEqual([])
    expect(friendlinessOf(declined.friendship, 'hoa')).toBe(0)
    const second = await game.proposeQuest(ctx.playerId, 'hoa', hoaDelivery())
    if (!second.accepted) throw new Error(second.reason)
    await game.applyEvents(ctx.playerId, [
      { type: 'deliver', itemId: 'broth', npcId: 'linh' },
    ])
    expect(
      (await game.fail(ctx.playerId, second.quest.id, 'declined', 'hoa')).quests
    ).toHaveLength(1)
    expect(
      friendlinessOf(
        (await game.abandon(ctx.playerId, second.quest.id)).friendship,
        'hoa'
      )
    ).toBe(-1)
  })
})
