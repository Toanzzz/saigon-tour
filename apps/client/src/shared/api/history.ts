import { type NpcHistory, NpcHistorySchema, type NpcId } from '@saigon/shared'
import { rpc } from './client'
import { queryClient } from './query'
export const historyKey = (npcId: NpcId) => ['npc-history', npcId] as const
export function cachedHistory(npcId: NpcId) {
  return (
    queryClient
      .getQueryData<NpcHistory>(historyKey(npcId))
      ?.messages.map(({ role, text, greeting }) => ({
        role,
        content: text,
        ...(greeting ? { greeting: true } : {}),
      })) ?? []
  )
}
export async function fetchHistory(npcId: NpcId) {
  return queryClient.fetchQuery({
    queryKey: historyKey(npcId),
    staleTime: 0,
    queryFn: async () => {
      const response = await rpc.npc[':npcId'].history.$get(
        { param: { npcId }, query: { limit: '30' } },
        { init: { signal: AbortSignal.timeout(5000) } }
      )
      if (!response.ok) throw new Error('history_unavailable')
      return NpcHistorySchema.parse(await response.json())
    },
  })
}
export function appendHistory(
  npcId: NpcId,
  message: string,
  reply: string,
  isGreeting = false
) {
  queryClient.setQueryData<NpcHistory>(historyKey(npcId), (old) => {
    const messages = old?.messages ?? []
    const latest = messages.at(-1)
    // Collapse a greeting only into a previous greeting. A real reply (e.g.
    // accepting an errand) stays, and the fresh greeting is appended after it.
    if (!message.trim() && latest?.role === 'assistant' && latest.greeting) {
      if (latest.text === reply) return old
      return {
        messages: [
          ...messages.slice(0, -1),
          {
            ...latest,
            text: reply,
            at: new Date().toISOString(),
            greeting: true,
          },
        ],
      }
    }
    return {
      messages: [
        ...messages,
        ...(message.trim()
          ? [
              {
                role: 'user' as const,
                text: message,
                at: new Date().toISOString(),
              },
            ]
          : []),
        {
          role: 'assistant' as const,
          text: reply,
          at: new Date().toISOString(),
          ...(isGreeting ? { greeting: true } : {}),
        },
      ].slice(-30),
    }
  })
}
