import { createTool } from '@mastra/core/tools'
import { QuestEventSchema } from '@saigon/shared'
import { z } from 'zod'
import { type NpcServices, requestValues } from './context'

export const createCheckQuestsTool = ({ game }: NpcServices) =>
  createTool({
    id: 'check-quests',
    description:
      'Verify every active errand you gave this player. The server grants rewards for ready quests exactly once.',
    inputSchema: z.object({}),
    outputSchema: z.object({ events: z.array(QuestEventSchema) }),
    execute: async (_input, context) => {
      const { playerId, npcId, outcome } = requestValues(context)
      outcome.calls.push('check-quests')
      const events = await game.checkQuests(playerId, npcId)
      outcome.events.push(...events)
      return { events }
    },
  })
