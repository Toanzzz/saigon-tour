import {
  advance,
  applyPlayerEvents,
  createQuest,
  type InteractResponse,
  InteractResponseSchema,
  NPCS,
  type NpcId,
  seedsFor,
  validateSpec,
  ZERO_REWARD,
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

/** Offline seeds use the same proposal validation and event engine as the server. */
export function offline(
  npc: NpcId,
  body: InteractBody,
  state: GameState
): InteractResponse {
  let world = structuredClone(state.world)
  let quests = structuredClone(state.quests)
  const questEvents: InteractResponse['questEvents'] = []
  // Pending events already changed the local world. Advance quests without charging twice.
  for (const event of [
    { type: 'talk' as const, npcId: npc },
    { type: 'visit' as const, locationId: body.worldContext.playerLocation },
  ]) {
    quests = quests.map((quest) => advance(quest, event))
  }
  world = applyPlayerEvents(world, [{ type: 'talk', npcId: npc }])
  let reply = `Chào bạn! I'm ${NPCS[npc].name}. ${NPCS[npc].knowledge[0]}`
  if (body.intent === 'help') {
    const spec = seedsFor(npc).find(
      (candidate) => validateSpec(candidate, { quests }).ok
    )
    if (spec) {
      const quest = createQuest(spec)
      quests.push(quest)
      for (const step of quest.steps)
        if (step.type === 'DELIVER')
          world.inventory[step.itemId] = Math.min(
            100,
            (world.inventory[step.itemId] ?? 0) + 1
          )
      questEvents.push({ type: 'offered', quest, reward: quest.reward })
      reply = `${quest.title}. ${quest.description}`
    } else
      reply =
        'You already have my errand, or your journal is full. Finish an errand and come back.'
  }
  if (body.intent === 'check') {
    for (const quest of quests.filter((entry) => entry.giverNpcId === npc)) {
      if (
        quest.status === 'ready' &&
        !world.completedQuestIds.includes(quest.id)
      ) {
        quest.status = 'completed'
        world.currency = Math.min(
          100000,
          world.currency + quest.reward.currency
        )
        world.completedQuestIds = [...world.completedQuestIds, quest.id].slice(
          -32
        )
        if (quest.reward.itemId)
          world.inventory[quest.reward.itemId] = Math.min(
            100,
            (world.inventory[quest.reward.itemId] ?? 0) + 1
          )
        questEvents.push({ type: 'completed', quest, reward: quest.reward })
      } else
        questEvents.push({ type: 'incomplete', quest, reward: ZERO_REWARD })
    }
    quests = quests.filter((quest) => quest.status !== 'completed')
    reply = questEvents.some((event) => event.type === 'completed')
      ? 'Cảm ơn! Your help means a lot. Here is your thank-you.'
      : 'There is still a little to do. Your journal shows the next step.'
  }
  return {
    revision: state.serverRevision,
    npcId: npc,
    reply,
    source: 'fallback',
    degraded: true,
    cached: false,
    party: null,
    world,
    quests,
    questEvents,
    toolCalls: [],
  }
}
