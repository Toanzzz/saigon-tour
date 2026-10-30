import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { type NpcServices, requestValues } from './context'

export const createOfferQuestTool = ({ game }: NpcServices) =>
  createTool({
    id: 'offer-quest',
    description:
      'Offer one of your quest templates to the player. The backend validates it, records it, and returns the canonical quest.',
    inputSchema: z.object({ questTemplateId: z.string().max(64) }),
    outputSchema: z.object({
      accepted: z.boolean(),
      reason: z.string(),
      quest: z
        .object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          rewardCurrency: z.number(),
        })
        .optional(),
    }),
    execute: async ({ questTemplateId }, context) => {
      const { playerId, npcId, outcome } = requestValues(context)
      outcome.calls.push('offer-quest')
      const result = game.offerQuest(playerId, npcId, questTemplateId)
      if (!result.accepted) return { accepted: false, reason: result.reason }
      outcome.offered = result.quest
      const { id, title, description, reward } = result.quest
      return {
        accepted: true,
        reason: 'recorded',
        quest: { id, title, description, rewardCurrency: reward.currency },
      }
    },
  })
