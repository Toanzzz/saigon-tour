import { createTool } from '@mastra/core/tools'
import { QuestSchema } from '@saigon/shared'
import { z } from 'zod'
import { type NpcServices, requestValues } from './context'

export const createGetContextTool = ({ game }: NpcServices) =>
  createTool({
    id: 'get-context',
    description:
      'Read player coins, places visited, active errands, completed errands and party members.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      coins: z.number(),
      visited: z.array(z.string()),
      metNeighbors: z.array(z.string()),
      quests: z.array(QuestSchema),
      completedQuests: z.number(),
      reputation: z.number(),
      partyMembers: z.array(z.string()),
    }),
    execute: async (_input, context) => {
      const { playerId, outcome } = requestValues(context)
      outcome.calls.push('get-context')
      const record = await game.get(playerId)
      return {
        coins: record.world.currency,
        visited: record.world.visitedLocations,
        metNeighbors: record.world.talkedTo,
        quests: record.quests,
        completedQuests: record.completed.length,
        reputation: record.reputation,
        partyMembers:
          game.party
            ?.snapshot(playerId)
            ?.members.map((member) => member.name) ?? [],
      }
    },
  })
