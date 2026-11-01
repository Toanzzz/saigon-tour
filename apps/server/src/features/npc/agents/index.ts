import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import {
  GIVER_UNLOCKS,
  type NeighborId,
  NPCS,
  type NpcId,
  QUEST_DOMAINS,
  seedsFor,
  UNLOCKS,
} from '@saigon/shared'
import { createNpcMemory } from '../memory/npc-memory'
import { cafeOwnerPersona } from '../personas/cafe-owner'
import { cycloDriverPersona } from '../personas/cyclo-driver'
import { lanternMakerPersona } from '../personas/lantern-maker'
import { marketVendorPersona } from '../personas/market-vendor'
import { musicStudentPersona } from '../personas/music-student'
import { postcardCollectorPersona } from '../personas/postcard-collector'
import { residentPersona } from '../personas/resident'
import { QUEST_RULES } from '../personas/shared'
import { visitingPhotographerPersona } from '../personas/visiting-photographer'
import { volunteerPersona } from '../personas/volunteer'
import { xeOmDriverPersona } from '../personas/xe-om-driver'
import { createAdjustFriendlinessTool } from '../tools/adjust-friendliness'
import type { NpcServices } from '../tools/context'
import { createDropQuestTool } from '../tools/drop-quest'
import { createGetContextTool } from '../tools/get-context'
import { createProposeQuestTool } from '../tools/propose-quest'
import { createRememberPlayerFactTool } from '../tools/remember-player-fact'

const NEIGHBOR_PERSONAS: Record<NeighborId, string> = {
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

/** Human-readable list of a giver's signature unlocks, so personas never promise rewards they can't grant. */
function unlockHint(id: NpcId): string {
  const ids = (GIVER_UNLOCKS as Record<string, string[]>)[id]
  if (!ids?.length) return ''
  const list = ids
    .map((unlockId) => `${unlockId} (${UNLOCKS[unlockId].tier})`)
    .join(', ')
  return `\nSignature rewards you grant as friendship grows: ${list}`
}

export const NPC_PERSONAS = Object.fromEntries(
  Object.values(NPCS).map((npc) => [
    npc.id,
    NEIGHBOR_PERSONAS[npc.id as NeighborId] ?? residentPersona(npc.id),
  ])
) as Record<NpcId, string>

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
    Object.entries(NPC_PERSONAS).map(([id, instructions]) => [
      id,
      new Agent({
        id,
        name: id,
        instructions: `${instructions}
${QUEST_RULES}
Your allowed entities: ${JSON.stringify(QUEST_DOMAINS[id as NpcId])}${unlockHint(id as NpcId)}
Example valid quest spec: ${JSON.stringify(seedsFor(id as NpcId, 'en')[0])}`,
        model,
        memory,
        tools,
      }),
    ])
  ) as unknown as Record<NpcId, Agent>
}
