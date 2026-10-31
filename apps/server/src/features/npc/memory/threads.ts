import { randomUUID } from 'node:crypto'
import type { MastraDBMessage } from '@mastra/core/agent'
import type { MastraCompositeStore } from '@mastra/core/storage'
import { NPCS, type NpcId } from '@saigon/shared'

export async function recordGreeting(
  storage: MastraCompositeStore,
  npcId: NpcId,
  playerId: string,
  message: string,
  reply: string
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
  const messages: MastraDBMessage[] = [
    { role: 'user' as const, text: message },
    { role: 'assistant' as const, text: reply },
  ].map(({ role, text }, index) => ({
    id: randomUUID(),
    threadId,
    resourceId: playerId,
    role,
    createdAt: new Date(createdAt.getTime() + index),
    content: { format: 2, parts: [{ type: 'text', text }] },
  }))
  await memory.saveMessages({ messages })
}

export async function clearPlayerThreads(
  storage: MastraCompositeStore,
  playerId: string
) {
  const memory = await storage.getStore('memory')
  if (!memory) throw new Error('npc_memory_store_unavailable')
  for (const npcId of Object.keys(NPCS))
    await memory.deleteThread({ threadId: `${npcId}:${playerId}` })
}
