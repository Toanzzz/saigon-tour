import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import { type NpcId, QUEST_DOMAINS, seedsFor } from '@saigon/shared'
import { createNpcMemory } from '../memory/npc-memory'
import { cafeOwnerPersona } from '../personas/cafe-owner'
import { cycloDriverPersona } from '../personas/cyclo-driver'
import { lanternMakerPersona } from '../personas/lantern-maker'
import { marketVendorPersona } from '../personas/market-vendor'
import { musicStudentPersona } from '../personas/music-student'
import { postcardCollectorPersona } from '../personas/postcard-collector'
import { QUEST_RULES } from '../personas/shared'
import { visitingPhotographerPersona } from '../personas/visiting-photographer'
import { volunteerPersona } from '../personas/volunteer'
import { xeOmDriverPersona } from '../personas/xe-om-driver'
import { createCheckQuestsTool } from '../tools/check-quests'
import type { NpcServices } from '../tools/context'
import { createGetContextTool } from '../tools/get-context'
import { createProposeQuestTool } from '../tools/propose-quest'
import { createRememberPlayerFactTool } from '../tools/remember-player-fact'

export const NPC_PERSONAS: Record<NpcId, string> = {
  hoa: marketVendorPersona,
  tam: xeOmDriverPersona,
  linh: volunteerPersona,
  ba: cycloDriverPersona,
  mai: cafeOwnerPersona,
  alex: visitingPhotographerPersona,
  vy: lanternMakerPersona,
  son: postcardCollectorPersona,
  thao: musicStudentPersona,
}

/** Each NPC gets its own persona and only the tools its role needs. */
export function createNpcAgents(
  model: MastraModelConfig,
  services: NpcServices
) {
  const tools = {
    proposeQuest: createProposeQuestTool(services),
    checkQuests: createCheckQuestsTool(services),
    getContext: createGetContextTool(services),
    rememberPlayerFact: createRememberPlayerFactTool(services),
  }
  const memory = createNpcMemory()
  return Object.fromEntries(
    Object.entries(NPC_PERSONAS).map(([id, instructions]) => [
      id,
      new Agent({
        id,
        name: id,
        instructions: `${instructions}
${QUEST_RULES}
Your allowed entities: ${JSON.stringify(QUEST_DOMAINS[id as NpcId])}
Example valid quest spec: ${JSON.stringify(seedsFor(id as NpcId, 'en')[0])}`,
        model,
        memory,
        tools,
      }),
    ])
  ) as unknown as Record<NpcId, Agent>
}
