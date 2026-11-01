import {
  DEMO_QUEST,
  type InteractResponse,
  InteractResponseSchema,
  NPCS,
  type NpcId,
  objectiveSatisfied,
  SECRET_QUESTS,
} from '@saigon/shared'
import type { InferRequestType, InferResponseType } from 'hono/client'
import { type GameState, game } from '@/shared/state/game'
import { rpc } from './client'

export { queryClient } from './query'

import { initializeSession, sessionToken } from './session'

/** NPC interact endpoint, typed from the shared Hono RPC contract. */
const interact$post = rpc.npc[':npcId'].interact.$post
export type InteractBody = InferRequestType<typeof interact$post>['json']
export type InteractResponsePayload = InferResponseType<typeof interact$post>

export interface InteractionResult {
  response: InteractResponse
  synced: boolean
}

/** Talk to an NPC. If the backend is unreachable, keep the loop playable offline. */
export async function interactWith(
  npc: NpcId,
  body: InteractBody,
  state: GameState
): Promise<InteractionResult> {
  try {
    if (!sessionToken() || state.guestStatus !== 'online') {
      await initializeSession()
      if (game.state.guestStatus !== 'online') throw new Error('Offline guest')
    }
    const response = await interact$post(
      { param: { npcId: npc }, json: body },
      {
        init: {
          credentials: 'include',
          signal: AbortSignal.timeout(14000),
        },
      }
    )
    if (!response.ok) throw new Error(`Guide unavailable (${response.status})`)
    // Validate the untrusted body; the parsed shape must match the RPC payload.
    const payload: InteractResponsePayload = InteractResponseSchema.parse(
      await response.json()
    )
    return { response: payload, synced: true }
  } catch {
    return { response: offline(npc, body, state), synced: false }
  }
}

/** Client-only fallback: mirrors the server's validated quest rules. */
function offline(
  npc: NpcId,
  body: InteractBody,
  state: GameState
): InteractResponse {
  const world = structuredClone(state.world)
  world.talkedTo = [...new Set([...world.talkedTo, npc])]
  let quest = state.quest
  let questEvent: InteractResponse['questEvent'] = null
  let reply = `Chào bạn! I'm ${NPCS[npc].name}. ${NPCS[npc].knowledge[0]}`
  const template =
    npc === 'hoa'
      ? DEMO_QUEST
      : Object.values(SECRET_QUESTS).find(
          (candidate) => candidate.giverNpcId === npc
        )
  const done = template ? world.completedQuestIds.includes(template.id) : false
  if (template && body.intent === 'help' && !quest && !done) {
    quest = structuredClone(template)
    world.inventory = {
      ...world.inventory,
      ...(template.objective.type === 'DELIVER'
        ? {
            [template.objective.itemId]:
              (world.inventory[template.objective.itemId] ?? 0) + 1,
          }
        : {}),
    }
    questEvent = { type: 'offered', quest, reward: quest.reward }
    reply =
      npc === 'hoa'
        ? 'Fresh herbs for Chị Linh in the park. Cảm ơn con!'
        : `Keep this quiet: ${quest.description}`
  } else if (
    template &&
    body.intent === 'check' &&
    quest?.id === template.id &&
    quest.giverNpcId === npc
  ) {
    if (objectiveSatisfied(quest, world)) {
      world.currency += quest.reward.currency
      world.completedQuestIds = [...world.completedQuestIds, quest.id]
      if (quest.reward.itemId)
        world.inventory = {
          ...world.inventory,
          [quest.reward.itemId]:
            (world.inventory[quest.reward.itemId] ?? 0) + 1,
        }
      questEvent = { type: 'completed', quest, reward: quest.reward }
      quest = null
      reply =
        npc === 'hoa'
          ? 'Perfect! A little kindness makes this city feel like home.'
          : 'You found the secret in the city. Cảm ơn for bringing it back to me.'
    } else {
      questEvent = {
        type: 'incomplete',
        quest,
        reward: { currency: 0, itemId: null, reputation: 0 },
      }
      reply =
        npc === 'hoa'
          ? 'Chị Linh is waiting in the park. Bring the herbs to her first.'
          : `The secret is still waiting at ${quest.objective.type === 'GO_TO' ? quest.objective.locationId : 'the next stop'}.`
    }
  } else if (template && !quest && !done)
    reply =
      npc === 'hoa'
        ? 'Chào bạn! Welcome to my little corner of Bến Thành. Could you help me with an errand?'
        : `I may know a secret about this city. Ask me when you are ready.`
  return {
    revision: state.serverRevision,
    npcId: npc,
    reply,
    source: 'fallback',
    degraded: true,
    cached: false,
    party: null,
    world,
    quest,
    questEvent,
    toolCalls: [],
  }
}
