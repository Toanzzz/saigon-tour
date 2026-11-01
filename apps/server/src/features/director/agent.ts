import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Agent } from '@mastra/core/agent'
import { CITY_ANCHORS, NEIGHBOR_IDS, QUEST_DOMAINS } from '@saigon/shared'
import type { CityWorld } from '@/domain/city'
import type { ServerConfig } from '@/shared/config'
import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'
import { type HarnessUsage, meteredFetch } from '../npc/meter'
import { DIRECTOR_PERSONA } from './persona'
import { directorTools } from './tools'

export function directorAgent(
  config: ServerConfig,
  db: GameDb,
  fetcher: Fetcher,
  city: CityWorld,
  calls: string[],
  usage: HarnessUsage,
  active: () => boolean = () => true
) {
  const provider = createOpenAICompatible({
    name: 'meta',
    baseURL: (config.apiUrl ?? '').replace(/\/chat\/completions\/?$/, ''),
    apiKey: config.apiKey ?? 'unset',
    fetch: meteredFetch(db, fetcher, config.spendLimitUsd, usage),
  })
  return new Agent({
    id: 'city-director',
    name: 'City Director',
    model: provider.chatModel(config.model ?? ''),
    instructions: `${DIRECTOR_PERSONA}\nAuthored anchors: ${JSON.stringify(CITY_ANCHORS)}\nNPC quest domains: ${JSON.stringify(Object.fromEntries(NEIGHBOR_IDS.map((id) => [id, QUEST_DOMAINS[id]])))}`,
    tools: directorTools(city, calls, active),
  })
}
