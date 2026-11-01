import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { type NpcServices, requestValues } from './context'
export const createAdjustFriendlinessTool = ({ game }: NpcServices) =>
  createTool({
    id: 'adjust-friendliness',
    description:
      'Rarely change your warmth toward this player after a meaningful kind or unkind exchange. At most once per turn.',
    inputSchema: z.object({
      direction: z.enum(['warmer', 'cooler']),
      reason: z.string().min(1).max(200),
    }),
    execute: async ({ direction }, context) => {
      const { playerId, npcId, outcome } = requestValues(context)
      if (outcome.calls.includes('adjust-friendliness'))
        return { accepted: false }
      outcome.calls.push('adjust-friendliness')
      const event = await game.adjustFriendship(playerId, npcId, direction)
      return { accepted: Boolean(event), event }
    },
  })
