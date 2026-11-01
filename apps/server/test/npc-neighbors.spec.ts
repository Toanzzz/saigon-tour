import { NPCS, type NpcId, type PlayerEvent, seedsFor } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { ask, offline, required, setupNpc } from './support/npc'

const ctx = setupNpc()
describe('every neighbor can author an errand', () => {
  it.each(Object.keys(NPCS) as NpcId[])(
    '%s offers, advances and rewards a seed without the model',
    async (npc) => {
      const harness = ctx.fx.harness(offline)
      const offered = await harness.interact(
        npc,
        ask('Any errands?', { intent: 'help' }),
        ctx.playerId
      )
      expect(offered.quests).toHaveLength(1)
      expect(offered.quests[0]?.giverNpcId).toBe(npc)
      const quest = required(offered.quests[0])
      const events: PlayerEvent[] = required(seedsFor(npc)[0]).steps.map(
        (step) => {
          if (step.type === 'GO_TO')
            return { type: 'visit', locationId: step.locationId }
          if (step.type === 'TALK_TO')
            return { type: 'talk', npcId: step.npcId }
          if (step.type === 'DELIVER')
            return { type: 'deliver', itemId: step.itemId, npcId: step.npcId }
          return { type: 'purchase', itemId: step.marketItemId }
        }
      )
      await harness.game.applyEvents(ctx.playerId, events)
      const completed = await harness.interact(
        npc,
        ask("I'm back", { intent: 'check' }),
        ctx.playerId
      )
      expect(
        completed.questEvents.find((e) => e.type === 'completed')?.quest.id
      ).toBe(quest.id)
      expect(completed.world.currency).toBe(30 + quest.reward.currency)
      expect(completed.quests).toEqual([])
    }
  )
})
