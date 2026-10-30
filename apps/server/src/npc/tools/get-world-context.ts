import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { type NpcServices, requestValues } from './context'

export const createGetWorldContextTool = ({ game }: NpcServices) =>
  createTool({
    id: 'get-world-context',
    description:
      "Read the player's public game state: coins, places visited, neighbors met, and active errand.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      coins: z.number(),
      visited: z.array(z.string()),
      metNeighbors: z.array(z.string()),
      activeQuest: z.string().nullable(),
      completedQuests: z.number(),
      reputation: z.number(),
    }),
    execute: async (_input, context) => {
      const { playerId, outcome } = requestValues(context)
      outcome.calls.push('get-world-context')
      const record = game.get(playerId)
      return {
        coins: record.world.currency,
        visited: record.world.visitedLocations,
        metNeighbors: record.world.talkedTo,
        activeQuest: record.quest?.title ?? null,
        completedQuests: record.completed.length,
        reputation: record.reputation,
      }
    },
  })
