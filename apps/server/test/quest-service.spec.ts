import { seedsFor } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { QuestService } from '@/domain/quests'
import { offline, required, setupNpc } from './support/npc'

const ctx = setupNpc()
describe('quest transactions', () => {
  it('enforces the active cap under concurrent proposals', async () => {
    const game = new QuestService(ctx.fx.db)
    const specs = ['hoa', 'tam', 'linh', 'ba'] as const
    const offers = await Promise.all(
      specs.map((npc) =>
        game.proposeQuest(ctx.playerId, npc, required(seedsFor(npc)[0]))
      )
    )
    expect(offers.filter((offer) => offer.accepted)).toHaveLength(3)
    expect(offers.find((offer) => !offer.accepted)).toMatchObject({
      reason: 'cap_reached:maximum_3_active_quests',
    })
  })

  it('checks every ready quest from the giver and leaves others active', async () => {
    const game = new QuestService(ctx.fx.db)
    const spec = required(seedsFor('hoa')[0])
    await game.proposeQuest(ctx.playerId, 'hoa', spec)
    await game.proposeQuest(ctx.playerId, 'hoa', {
      ...spec,
      title: 'Hello in the park',
      steps: [{ type: 'GO_TO', locationId: 'park' }],
    })
    await game.proposeQuest(ctx.playerId, 'tam', required(seedsFor('tam')[0]))
    await game.applyEvents(ctx.playerId, [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
      { type: 'visit', locationId: 'park' },
    ])
    expect(
      (await game.checkQuests(ctx.playerId, 'hoa')).map((event) => event.type)
    ).toEqual(['completed', 'completed'])
    expect(
      (await game.get(ctx.playerId)).quests.map((quest) => quest.giverNpcId)
    ).toEqual(['tam'])
  })

  it('can deliver the same item to the same neighbor for a new quest', async () => {
    const game = new QuestService(ctx.fx.db)
    for (let repeat = 0; repeat < 2; repeat++) {
      await game.proposeQuest(ctx.playerId, 'hoa', required(seedsFor('hoa')[0]))
      await game.applyEvents(ctx.playerId, [
        { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
      ])
      expect((await game.checkQuests(ctx.playerId, 'hoa'))[0]?.type).toBe(
        'completed'
      )
    }
    expect((await game.get(ctx.playerId)).completed).toHaveLength(2)
  })

  it('returns a progress event after a real step and an incomplete event on check', async () => {
    const harness = ctx.fx.harness(offline)
    await harness.game.proposeQuest(
      ctx.playerId,
      'linh',
      required(seedsFor('linh')[0])
    )
    const result = await harness.interact(
      'linh',
      {
        message: "I'm back",
        intent: 'check',
        events: [{ type: 'visit', locationId: 'market' }],
        worldContext: { playerLocation: 'park', timeOfDay: 'morning' },
      },
      ctx.playerId
    )
    expect(result.questEvents.map((event) => event.type)).toEqual([
      'progress',
      'incomplete',
    ])
  })
})
