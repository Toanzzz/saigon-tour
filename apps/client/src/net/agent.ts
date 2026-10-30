import {
  DEMO_QUEST,
  type InteractRequest,
  type InteractResponse,
  InteractResponseSchema,
  NPCS,
  type NpcId,
  objectiveSatisfied,
} from '@saigon/shared'
import { QueryClient } from '@tanstack/react-query'
import type { GameState } from '../state/game'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})
const base = import.meta.env.VITE_API_BASE_URL || '/api'

/** Talk to an NPC. If the backend is unreachable, keep the loop playable offline. */
export async function interactWith(
  npc: NpcId,
  body: InteractRequest,
  state: GameState
): Promise<InteractResponse> {
  try {
    const response = await fetch(`${base}/npc/${npc}/interact`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(14000),
    })
    if (!response.ok) throw new Error(`Guide unavailable (${response.status})`)
    return InteractResponseSchema.parse(await response.json())
  } catch {
    return offline(npc, body, state)
  }
}

/** Client-only fallback: mirrors the server's validated rules for one demo quest. */
function offline(
  npc: NpcId,
  body: InteractRequest,
  state: GameState
): InteractResponse {
  const world = structuredClone(state.world)
  world.talkedTo = [...new Set([...world.talkedTo, npc])]
  let quest = state.quest
  let questEvent: InteractResponse['questEvent'] = null
  let reply = `Chào bạn! I'm ${NPCS[npc].name}. ${NPCS[npc].knowledge[0]}`
  const done = world.completedQuestIds.includes(DEMO_QUEST.id)
  if (npc === 'hoa' && body.intent === 'help' && !quest && !done) {
    quest = structuredClone(DEMO_QUEST)
    world.inventory = {
      ...world.inventory,
      herbs: (world.inventory.herbs ?? 0) + 1,
    }
    questEvent = { type: 'offered', quest, reward: quest.reward }
    reply = 'Fresh herbs for Chị Linh in the park. Cảm ơn con!'
  } else if (npc === 'hoa' && body.intent === 'check' && quest) {
    if (objectiveSatisfied(quest, world)) {
      world.currency += quest.reward.currency
      world.completedQuestIds = [...world.completedQuestIds, quest.id]
      world.inventory = {
        ...world.inventory,
        postcard: (world.inventory.postcard ?? 0) + 1,
      }
      questEvent = { type: 'completed', quest, reward: quest.reward }
      quest = null
      reply = 'Perfect! A little kindness makes this city feel like home.'
    } else {
      questEvent = {
        type: 'incomplete',
        quest,
        reward: { currency: 0, itemId: null, reputation: 0 },
      }
      reply = 'Chị Linh is waiting in the park. Bring the herbs to her first.'
    }
  } else if (npc === 'hoa' && !quest && !done)
    reply =
      'Chào bạn! Welcome to my little corner of Bến Thành. Could you help me with an errand?'
  return {
    npcId: npc,
    reply,
    source: 'fallback',
    degraded: true,
    world,
    quest,
    questEvent,
    toolCalls: [],
  }
}
