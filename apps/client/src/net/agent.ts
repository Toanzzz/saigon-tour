import type { AppType } from '@saigon/server'
import {
  type ChatRequest,
  ChatResponseSchema,
  DEMO_QUEST,
  NPCS,
  objectiveSatisfied,
  type QuestRequest,
  QuestResponseSchema,
  type VerifyRequest,
  VerifyResponseSchema,
} from '@saigon/shared'
import { QueryClient } from '@tanstack/react-query'
import { hc } from 'hono/client'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})
const base = import.meta.env.VITE_API_BASE_URL || '/api'
export const api = hc<AppType>(base)

async function request(path: 'chat' | 'quest' | 'verify', body: unknown) {
  const response = await fetch(`${base}/npc/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(11000),
  })
  if (!response.ok) throw new Error(`Guide unavailable (${response.status})`)
  return response.json()
}
export const agent = {
  async chat(body: ChatRequest) {
    try {
      return ChatResponseSchema.parse(await request('chat', body))
    } catch {
      return ChatResponseSchema.parse({
        reply:
          body.personaId === 'hoa'
            ? 'Chào bạn! Welcome to my little corner of Bến Thành. Could you bring these fresh herbs to Chị Linh in the park?'
            : `Chào bạn! I'm ${NPCS[body.personaId].name}. ${NPCS[body.personaId].knowledge[0]}`,
        mayOfferQuest: body.personaId === 'hoa',
        source: 'fallback',
      })
    }
  },
  async quest(body: QuestRequest) {
    try {
      return QuestResponseSchema.parse(await request('quest', body))
    } catch {
      return {
        quest: DEMO_QUEST,
        line: 'Fresh herbs, a short journey, and a happy neighbor. Cảm ơn!',
        source: 'fallback' as const,
      }
    }
  },
  async verify(body: VerifyRequest) {
    try {
      return VerifyResponseSchema.parse(await request('verify', body))
    } catch {
      const done = objectiveSatisfied(body.quest, body.worldState)
      return {
        status: done ? ('COMPLETE' as const) : ('INCOMPLETE' as const),
        reward: done
          ? body.quest.reward
          : { currency: 0, itemId: null, reputation: 0 },
        line: done
          ? 'Perfect! A little kindness makes this city feel like home.'
          : 'Chị Linh is waiting in the park. Bring the herbs to her first.',
        source: 'fallback' as const,
      }
    }
  },
}
