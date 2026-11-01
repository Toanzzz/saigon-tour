import { createTool } from '@mastra/core/tools'
import { ModelQuestSpecSchema, QuestSchema } from '@saigon/shared'
import { z } from 'zod'
import { type NpcServices, requestValues } from './context'

export const createProposeQuestTool = ({ game }: NpcServices) =>
  createTool({
    id: 'propose-quest',
    description:
      'Write a short errand using your allowed entities. The server validates every step and sets the id and reward. Correct rejected specs using the returned reason. Optionally add payoff, twist, and riddle.',
    inputSchema: ModelQuestSpecSchema,
    outputSchema: z.object({
      accepted: z.boolean(),
      reason: z.string(),
      quest: QuestSchema.optional(),
    }),
    execute: async (spec, context) => {
      const { playerId, npcId, outcome } = requestValues(context)
      outcome.calls.push('propose-quest')
      const result = await game.proposeQuest(playerId, npcId, spec)
      if (!result.accepted) return { accepted: false, reason: result.reason }
      outcome.events.push({
        type: 'offered',
        quest: result.quest,
        reward: result.quest.reward,
      })
      return { accepted: true, reason: 'recorded', quest: result.quest }
    },
  })
