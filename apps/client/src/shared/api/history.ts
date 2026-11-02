import {
  type InteractResponse,
  type NpcHistory,
  NpcHistorySchema,
  type NpcId,
} from '@saigon/shared'
import { type ChatMessage, game } from '@/shared/state/game'
import { rpc } from './client'
import { queryClient } from './query'

export const historyKey = (npcId: NpcId) => ['npc-history', npcId] as const

type StoredMessage = NpcHistory['messages'][number]
const fingerprint = (line: StoredMessage) =>
  `${line.role}:${line.at}:${line.text}`
export function mergeHistory(...groups: StoredMessage[][]): StoredMessage[] {
  const messages = new Map<string, StoredMessage>()
  const legacy = new Map<string, string>()
  for (const group of groups) {
    for (const line of group) {
      const signature = fingerprint(line)
      const key = line.id ?? signature
      const legacyKey = legacy.get(signature)
      if (legacyKey) {
        const existing = messages.get(legacyKey)
        if (existing?.id && !line.id) continue
        if (!existing?.id || !line.id) messages.delete(legacyKey)
      }
      messages.set(key, line)
      legacy.set(signature, key)
    }
  }
  return [...messages.values()]
    .sort((a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0))
    .slice(-30)
}
const display = ({ role, text, ...rest }: StoredMessage): ChatMessage => ({
  ...rest,
  role,
  content: text,
})
export function cachedHistory(npcId: NpcId): ChatMessage[] {
  return (
    queryClient
      .getQueryData<NpcHistory>(historyKey(npcId))
      ?.messages.map(display) ?? []
  )
}
export async function fetchHistory(npcId: NpcId) {
  const sessionId = game.state.sessionId
  return queryClient.fetchQuery({
    queryKey: historyKey(npcId),
    staleTime: 0,
    queryFn: async () => {
      const response = await rpc.npc[':npcId'].history.$get(
        { param: { npcId }, query: { limit: '30' } },
        { init: { signal: AbortSignal.timeout(5000) } }
      )
      if (!response.ok) throw new Error('history_unavailable')
      const fetched = NpcHistorySchema.parse(await response.json())
      if (game.state.sessionId !== sessionId)
        throw new Error('history_session_changed')
      const old = queryClient.getQueryData<NpcHistory>(historyKey(npcId))
      return { messages: mergeHistory(old?.messages ?? [], fetched.messages) }
    },
  })
}
export function appendHistory(
  npcId: NpcId,
  message: string,
  reply: string,
  isGreeting = false,
  metadata: {
    messageId?: string
    sentAt?: string
    messages?: InteractResponse['messages']
  } = {}
) {
  const now = new Date().toISOString()
  const messages: StoredMessage[] = metadata.messages ?? [
    ...(message.trim()
      ? [
          {
            role: 'user' as const,
            text: message,
            id: metadata.messageId ?? crypto.randomUUID(),
            at: metadata.sentAt ?? now,
          },
        ]
      : []),
    ...(reply.trim()
      ? [
          {
            role: 'assistant' as const,
            text: reply,
            id: crypto.randomUUID(),
            at: now,
            ...(isGreeting ? { greeting: true } : {}),
          },
        ]
      : []),
  ]
  queryClient.setQueryData<NpcHistory>(historyKey(npcId), (old) => ({
    messages: mergeHistory(old?.messages ?? [], messages),
  }))
  return messages.map(display)
}
