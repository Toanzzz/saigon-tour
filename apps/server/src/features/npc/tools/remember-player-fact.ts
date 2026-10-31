import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { safeLine } from '../safety'
import { type NpcServices, requestValues } from './context'

export const createRememberPlayerFactTool = ({ memory }: NpcServices) =>
  createTool({
    id: 'remember-player-fact',
    description:
      'Store one important, durable fact about the player for future conversations.',
    inputSchema: z.object({
      fact: z.string().min(3).max(240),
      importance: z.enum(['low', 'medium', 'high']),
    }),
    outputSchema: z.object({ stored: z.boolean() }),
    execute: async ({ fact, importance }, context) => {
      const { playerId, npcId, outcome } = requestValues(context)
      outcome.calls.push('remember-player-fact')
      if (!safeLine(fact)) return { stored: false }
      return {
        stored: await memory.remember({ npcId, playerId, fact, importance }),
      }
    },
  })
