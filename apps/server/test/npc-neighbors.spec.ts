import type { NpcId, PlayerEvent } from '@saigon/shared'
import { MARKET_ITEMS, NPCS } from '@saigon/shared'
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
      const eventFor = (step: (typeof quest.steps)[number]): PlayerEvent => {
        if (step.type === 'GO_TO')
          return { type: 'visit', locationId: step.locationId }
        if (step.type === 'TALK_TO') return { type: 'talk', npcId: step.npcId }
        if (step.type === 'DELIVER' || step.type === 'BRING')
          return { type: 'deliver', itemId: step.itemId, npcId: step.npcId }
        return { type: 'purchase', itemId: step.marketItemId }
      }
      // Apply one step at a time and re-read the quest, so a mid-quest twist
      // (which rewrites the final step) is followed to its new target.
      for (let i = 0; i < quest.steps.length; i++) {
        const live = (await harness.game.get(ctx.playerId)).quests.find(
          (entry) => entry.id === quest.id
        )
        const events: PlayerEvent[] = [
          eventFor(required(required(live).steps[i])),
        ]
        await harness.game.applyEvents(ctx.playerId, events)
      }
      const completed = await harness.interact(
        npc,
        ask("I'm back", { intent: 'check' }),
        ctx.playerId
      )
      const event = completed.questEvents.find((e) => e.type === 'completed')
      expect(event?.quest.id).toBe(quest.id)
      // A BUY step spends market coins; the thrifty bonus still applies since
      // no ride fares were charged. Account for any purchase in the balance.
      const spent = quest.steps
        .filter((step) => step.type === 'BUY')
        .reduce((sum, step) => sum + MARKET_ITEMS[step.marketItemId].price, 0)
      expect(completed.world.currency).toBe(
        30 - spent + (event?.reward.currency ?? 0)
      )
      expect(completed.quests).toEqual([])
    }
  )
})
