import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import type { NpcId } from '@saigon/shared'
import { createNpcMemory } from '../memory/npc-memory'
import { cycloDriverPersona } from '../personas/cyclo-driver'
import { marketVendorPersona } from '../personas/market-vendor'
import { volunteerPersona } from '../personas/volunteer'
import { xeOmDriverPersona } from '../personas/xe-om-driver'
import { createCheckQuestTool } from '../tools/check-quest'
import type { NpcServices } from '../tools/context'
import { createGetWorldContextTool } from '../tools/get-world-context'
import { createOfferQuestTool } from '../tools/offer-quest'
import { createRememberPlayerFactTool } from '../tools/remember-player-fact'

export const NPC_PERSONAS: Record<NpcId, string> = {
  hoa: marketVendorPersona,
  tam: xeOmDriverPersona,
  linh: volunteerPersona,
  ba: cycloDriverPersona,
}

/** Each NPC gets its own persona and only the tools its role needs. */
export function createNpcAgents(
  model: MastraModelConfig,
  services: NpcServices
) {
  const offerQuest = createOfferQuestTool(services)
  const checkQuest = createCheckQuestTool(services)
  const rememberPlayerFact = createRememberPlayerFactTool(services)
  const getWorldContext = createGetWorldContextTool(services)
  const memory = createNpcMemory()
  const agent = (
    id: NpcId,
    name: string,
    instructions: string,
    tools: object
  ) =>
    new Agent({ id, name, instructions, model, memory, tools: tools as never })
  return {
    hoa: agent('hoa', 'Cô Hoa', marketVendorPersona, {
      offerQuest,
      checkQuest,
      rememberPlayerFact,
      getWorldContext,
    }),
    tam: agent('tam', 'Anh Tâm', xeOmDriverPersona, {
      rememberPlayerFact,
      getWorldContext,
    }),
    linh: agent('linh', 'Chị Linh', volunteerPersona, {
      rememberPlayerFact,
      getWorldContext,
    }),
    ba: agent('ba', 'Ông Ba', cycloDriverPersona, { rememberPlayerFact }),
  } satisfies Record<NpcId, Agent>
}
