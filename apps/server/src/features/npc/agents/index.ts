import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import {
  GIVER_UNLOCKS,
  NPCS,
  type NpcId,
  QUEST_DOMAINS,
  seedsFor,
  UNLOCKS,
} from '@saigon/shared'
import { NPC_PROMPTS } from '@saigon/shared/personas'
import { createNpcMemory } from '../memory/npc-memory'
import { QUEST_RULES, SHARED_RULES } from '../personas/shared'
import { createAdjustFriendlinessTool } from '../tools/adjust-friendliness'
import type { NpcServices } from '../tools/context'
import { createDropQuestTool } from '../tools/drop-quest'
import { createGetContextTool } from '../tools/get-context'
import { createProposeQuestTool } from '../tools/propose-quest'
import { createRememberPlayerFactTool } from '../tools/remember-player-fact'

/** Human-readable list of a giver's signature unlocks, so personas never promise rewards they can't grant. */
function unlockHint(id: NpcId): string {
  const ids = (GIVER_UNLOCKS as Record<string, string[]>)[id]
  if (!ids?.length) return ''
  const list = ids
    .map((unlockId) => `${unlockId} (${UNLOCKS[unlockId].tier})`)
    .join(', ')
  return `\nSignature rewards you grant as friendship grows: ${list}`
}

/**
 * Persona body plus the shared rules. The prompt bodies now live in each NPC
 * package (via `@saigon/shared/personas`) without SHARED_RULES; the server
 * appends it here, keeping the composed prompt byte-identical. Mutable so tests
 * can tweak a single prompt.
 */
export const NPC_PERSONAS = Object.fromEntries(
  (Object.keys(NPCS) as NpcId[]).map((id) => [
    id,
    `${NPC_PROMPTS[id]}\n${SHARED_RULES}`,
  ])
) as Record<NpcId, string>

/** Compose an NPC's full agent instructions: persona, quest rules, allowed entities, unlocks, and an example quest. */
export function npcInstructions(id: NpcId): string {
  return `${NPC_PERSONAS[id]}
${QUEST_RULES}
Your allowed entities: ${JSON.stringify(QUEST_DOMAINS[id])}${unlockHint(id)}
Example valid quest spec: ${JSON.stringify(seedsFor(id, 'en')[0])}`
}

/** Each NPC gets its own persona and only the tools its role needs. */
export function createNpcAgents(
  model: MastraModelConfig,
  services: NpcServices
) {
  const tools = {
    proposeQuest: createProposeQuestTool(services),
    adjustFriendliness: createAdjustFriendlinessTool(services),
    dropQuest: createDropQuestTool(services),
    getContext: createGetContextTool(services),
    rememberPlayerFact: createRememberPlayerFactTool(services),
  }
  const memory = createNpcMemory(model)
  return Object.fromEntries(
    Object.keys(NPC_PERSONAS).map((id) => [
      id,
      new Agent({
        id,
        name: id,
        instructions: npcInstructions(id as NpcId),
        model,
        memory,
        tools,
      }),
    ])
  ) as unknown as Record<NpcId, Agent>
}
