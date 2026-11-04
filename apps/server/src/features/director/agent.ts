import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Agent } from '@mastra/core/agent'
import {
  CITY_ANCHORS,
  type CityPlanBeat,
  NEIGHBOR_IDS,
  NPC_ACTIVITIES,
  QUEST_DOMAINS,
  RARE_WEARABLES,
} from '@saigon/shared'
import type { CityWorld } from '@/domain/city'
import type { ServerConfig } from '@/shared/config'
import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'
import { type HarnessUsage, meteredFetch } from '../npc/meter'
import { DIRECTOR_PERSONA } from './persona'
import { directorPlanTools } from './tools'

const directorActivities = Object.fromEntries(
  Object.entries(NPC_ACTIVITIES).map(([npc, catalog]) => [
    npc,
    Object.fromEntries(
      Object.entries(catalog).map(
        ([id, { conversationHints: _, ...activity }]) => [id, activity]
      )
    ),
  ])
)

export function directorAgent(
  config: ServerConfig,
  db: GameDb,
  fetcher: Fetcher,
  city: CityWorld,
  plan: CityPlanBeat[],
  usage: HarnessUsage,
  active: () => boolean = () => true
) {
  const provider = createOpenAICompatible({
    name: 'meta',
    baseURL: (config.apiUrl ?? '').replace(/\/chat\/completions\/?$/, ''),
    apiKey: config.apiKey ?? 'unset',
    fetch: meteredFetch(
      db,
      fetcher,
      config.spendLimitUsd,
      usage,
      false,
      config.production
    ),
  })
  return new Agent({
    id: 'city-director',
    name: 'City Director',
    model: provider.chatModel(config.model ?? ''),
    instructions: `${DIRECTOR_PERSONA}\nRare wearable catalog: ${JSON.stringify(RARE_WEARABLES)}\nAuthored anchors: ${JSON.stringify(CITY_ANCHORS)}\nNPC activities: ${JSON.stringify(directorActivities)}\nNPC quest domains: ${JSON.stringify(Object.fromEntries(NEIGHBOR_IDS.map((id) => [id, QUEST_DOMAINS[id]])))}`,
    tools: directorPlanTools(city, plan, active),
  })
}
