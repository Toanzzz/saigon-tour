import { randomUUID } from 'node:crypto'
import type { MastraDBMessage } from '@mastra/core/agent'
import type { MastraCompositeStore } from '@mastra/core/storage'
import { NPCS, type NpcId } from '@saigon/shared'

export async function recordTurn(
  storage: MastraCompositeStore,
  npcId: NpcId,
  playerId: string,
  message: string,
  reply: string,
  replaceGreeting = false
) {
  const memory = await storage.getStore('memory')
  if (!memory) throw new Error('npc_memory_store_unavailable')
  const threadId = `${npcId}:${playerId}`
  const createdAt = new Date()
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
  if (!message.trim()) {
    const latest = (
      await memory.listMessages({
        threadId,
        resourceId: playerId,
        perPage: 1,
        page: 0,
        orderBy: { field: 'createdAt', direction: 'DESC' },
      })
    ).messages[0]
    if (latest?.role === 'assistant') {
      const text = latest.content.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n')
      if (text === reply) return false
      // Only collapse a stale greeting into the new one. A substantive reply
      // (e.g. accepting an errand) is preserved, and the fresh state-aware
      // greeting is appended after it.
      if (replaceGreeting && latest.content.metadata?.greeting === true) {
        await memory.updateMessages({
          messages: [
            {
              id: latest.id,
              content: {
                format: 2,
                parts: [{ type: 'text', text: reply }],
                metadata: { greeting: true },
              },
            },
          ],
        })
        return true
      }
    }
  }
  const messages: MastraDBMessage[] = [
    ...(message.trim() ? [{ role: 'user' as const, text: message }] : []),
    { role: 'assistant' as const, text: reply },
  ].map(({ role, text }, index) => ({
    id: randomUUID(),
    threadId,
    resourceId: playerId,
    role,
    createdAt: new Date(createdAt.getTime() + index),
    content: {
      format: 2,
      parts: [{ type: 'text', text }],
      // Tag greeting-only turns so a later revisit replaces rather than stacks.
      ...(role === 'assistant' && replaceGreeting && !message.trim()
        ? { metadata: { greeting: true } }
        : {}),
    },
  }))
  await memory.saveMessages({ messages })
  return true
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
