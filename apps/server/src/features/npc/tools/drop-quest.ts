import { createTool } from '@mastra/core/tools'
import { ZERO_REWARD } from '@saigon/shared'
import { z } from 'zod'
import { type NpcServices, requestValues } from './context'
export const createDropQuestTool = ({ game }: NpcServices) =>
  createTool({
    id: 'drop-quest',
    description:
      'Decline your own active errand when the player refuses it, only before any progress.',
    inputSchema: z.object({ questId: z.string().max(66) }),
    execute: async ({ questId }, context) => {
      const { playerId, npcId, outcome } = requestValues(context)
      outcome.calls.push('drop-quest')
      const before = await game.get(playerId)
      const quest = before.quests.find((entry) => entry.id === questId)
      const after = await game.fail(playerId, questId, 'declined', npcId)
      const accepted = Boolean(
        quest && !after.quests.some((entry) => entry.id === questId)
      )
      if (quest && accepted)
        outcome.events.push({
          type: 'failed',
          reason: 'declined',
          quest,
          reward: ZERO_REWARD,
        })
      return { accepted }
    },
  })
