import { friendlinessOf, seedsFor } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { ask, live, offline, required, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()
describe('dropQuest tool', () => {
  it('records a decline and applies its penalty once', async () => {
    const game = ctx.fx.harness(offline).game
    const offer = await game.proposeQuest(
      ctx.playerId,
      'hoa',
      required(seedsFor('hoa')[0])
    )
    if (!offer.accepted) throw new Error(offer.reason)
    const harness = ctx.fx.harness(
      live,
      scripted([
        { tool: ['dropQuest', { questId: offer.quest.id }] },
        { text: 'All right, perhaps another time.' },
      ])
    )
    const response = await harness.interact(
      'hoa',
      ask('No, I cannot do that errand.'),
      ctx.playerId
    )
    expect(response.quests).toEqual([])
    expect(response.questEvents).toContainEqual(
      expect.objectContaining({ type: 'failed', reason: 'declined' })
    )
    expect(response.friendshipEvents).toContainEqual({
      npcId: 'hoa',
      delta: -1,
      level: 0,
      reason: 'declined',
    })
    expect(friendlinessOf(response.friendship, 'hoa')).toBe(0)
    expect(response.world.inventory.herbs).toBe(0)
  })
})
