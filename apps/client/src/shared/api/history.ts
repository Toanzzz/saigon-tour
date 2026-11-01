import { type NpcHistory, NpcHistorySchema, type NpcId } from '@saigon/shared'
import { rpc } from './client'
import { queryClient } from './query'
export const historyKey = (npcId: NpcId) => ['npc-history', npcId] as const
export function cachedHistory(npcId: NpcId) {
  return (
    queryClient
      .getQueryData<NpcHistory>(historyKey(npcId))
      ?.messages.map(({ role, text }) => ({ role, content: text })) ?? []
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
export function appendHistory(npcId: NpcId, message: string, reply: string) {
  queryClient.setQueryData<NpcHistory>(historyKey(npcId), (old) => ({
    messages: [
      ...(old?.messages ?? []),
      { role: 'user' as const, text: message, at: new Date().toISOString() },
      { role: 'assistant' as const, text: reply, at: new Date().toISOString() },
    ].slice(-30),
  }))
}
