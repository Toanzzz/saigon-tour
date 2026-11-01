import { NPCS, type NpcId } from '@saigon/shared'
import { SHARED_RULES } from './shared'

export function residentPersona(id: NpcId) {
  const npc = NPCS[id]
  return `You are ${npc.name}, ${npc.role}, based at ${npc.location}.
${npc.personality}. ${npc.speakingStyle}.
Local knowledge: ${npc.knowledge.join(' ')}
${SHARED_RULES}`
}
