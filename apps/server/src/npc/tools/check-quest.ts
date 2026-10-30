import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { type NpcServices, requestValues } from './context'

export const createCheckQuestTool = ({ game }: NpcServices) =>
  createTool({
    id: 'check-quest',
    description:
      "Check whether the player's active quest from you is complete. The backend verifies the objective and grants the reward itself.",
    inputSchema: z.object({ questId: z.string().max(64) }),
    outputSchema: z.object({
      questId: z.string(),
      status: z.enum(['active', 'completed', 'not_found']),
      rewardGranted: z.boolean(),
      rewardCurrency: z.number(),
      message: z.string(),
    }),
    execute: async ({ questId }, context) => {
      const { playerId, npcId, outcome } = requestValues(context)
      outcome.calls.push('check-quest')
      const quest = game.get(playerId).quest
      const result = game.checkQuest(playerId, npcId, questId)
      if (result.rewardGranted && quest)
        outcome.completed = { quest, reward: result.reward }
      else if (result.status === 'active' && quest) outcome.incomplete = quest
      return {
        questId,
        status: result.status,
        rewardGranted: result.rewardGranted,
        rewardCurrency: result.reward.currency,
        message: result.message,
      }
    },
  })
