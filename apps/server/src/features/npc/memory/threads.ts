import { createHash, randomUUID } from 'node:crypto'
import type { MastraDBMessage } from '@mastra/core/agent'
import type { MastraCompositeStore } from '@mastra/core/storage'
import { NPCS, type NpcId } from '@saigon/shared'

export async function recordTurn(
  storage: MastraCompositeStore,
  npcId: NpcId,
  playerId: string,
  message: string,
  reply: string,
  timing: { messageId?: string; sentAt?: Date } = {}
) {
  const memory = await storage.getStore('memory')
  if (!memory) throw new Error('npc_memory_store_unavailable')
  const threadId = `${npcId}:${playerId}`
  const userId = timing.messageId
    ? createHash('sha256')
        .update(`${threadId}:${timing.messageId}`)
        .digest('hex')
    : randomUUID()
  const latest = (
    await memory.listMessages({
      threadId,
      resourceId: playerId,
      perPage: 1,
      page: 0,
      orderBy: { field: 'createdAt', direction: 'DESC' },
    })
  ).messages[0]
  const previousAt = latest?.createdAt.getTime() ?? 0
  const createdAt = new Date(Math.max(Date.now(), previousAt + 2))
  const existing = await memory.getThreadById({ threadId })
  if (!existing)
    await memory.saveThread({
      thread: {
        id: threadId,
        resourceId: playerId,
        title: `${NPCS[npcId].name} conversation`,
        createdAt,
        updatedAt: createdAt,
      },
    })
  const messages: MastraDBMessage[] = [
    ...(message.trim() ? [{ role: 'user' as const, text: message }] : []),
    { role: 'assistant' as const, text: reply },
  ].map(({ role, text }) => ({
    id: role === 'user' ? userId : randomUUID(),
    threadId,
    resourceId: playerId,
    role,
    createdAt:
      role === 'user'
        ? new Date(
            Math.max(
              previousAt + 1,
              Math.min(
                createdAt.getTime() - 1,
                timing.sentAt?.getTime() ?? createdAt.getTime() - 1
              )
            )
          )
        : createdAt,
    content: {
      format: 2,
      parts: [{ type: 'text', text }],
    },
  }))
  await memory.saveMessages({ messages })
  return messages.map((entry) => ({
    id: entry.id,
    role: entry.role as 'user' | 'assistant',
    text: entry.content.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n'),
    at: entry.createdAt.toISOString(),
  }))
}

export async function clearPlayerThreads(
  storage: MastraCompositeStore,
  playerId: string
) {
  const memory = await storage.getStore('memory')
  if (!memory) throw new Error('npc_memory_store_unavailable')
  for (const npcId of Object.keys(NPCS)) {
    await memory.clearObservationalMemory(`${npcId}:${playerId}`, playerId)
    await memory.deleteThread({ threadId: `${npcId}:${playerId}` })
  }
}

export async function readHistory(
  storage: MastraCompositeStore,
  npcId: NpcId,
  playerId: string,
  limit = 30
) {
  const memory = await storage.getStore('memory')
  if (!memory) throw new Error('npc_memory_store_unavailable')
  const result = await memory.listMessages({
    threadId: `${npcId}:${playerId}`,
    resourceId: playerId,
    perPage: limit,
    page: 0,
    orderBy: { field: 'createdAt', direction: 'DESC' },
  })
  return {
    messages: result.messages.reverse().flatMap((message) => {
      if (message.role !== 'user' && message.role !== 'assistant') return []
      const text = message.content.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n')
      return text.trim()
        ? [
            {
              id: message.id,
              role: message.role,
              text,
              at: message.createdAt.toISOString(),
              ...(message.content.metadata?.greeting === true
                ? { greeting: true }
                : {}),
            },
          ]
        : []
    }),
  }
}
