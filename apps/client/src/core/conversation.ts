import type { InteractResponse, ItemId, NpcId, TimeOfDay } from '@saigon/shared'
import { audio } from '../audio'
import { interactWith, queryClient } from '../net/agent'
import {
  type GameState,
  game,
  grantReward,
  notify,
  update,
} from '../state/game'
import { distance, PEOPLE } from './places'

export type Intent = 'chat' | 'help' | 'check'

const timeOfDay = (hour = new Date().getHours()): TimeOfDay =>
  hour < 11
    ? 'morning'
    : hour < 17
      ? 'afternoon'
      : hour < 21
        ? 'evening'
        : 'night'

/** Local, optimistic hand-over; the backend re-validates it from the event. */
export function deliver(
  state: GameState,
  itemId: ItemId,
  npc: NpcId
): GameState {
  const held = state.world.inventory[itemId] ?? 0
  if (held <= 0) return state
  return {
    ...state,
    world: {
      ...state.world,
      inventory: { ...state.world.inventory, [itemId]: held - 1 },
      deliveredItems: [
        ...new Set([...state.world.deliveredItems, `${itemId}:${npc}`]),
      ],
    },
    pending: [...state.pending, { type: 'deliver', itemId, npcId: npc }],
  }
}

async function mutate<T>(fn: () => Promise<T>) {
  return queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: fn })
    .execute(undefined)
}

/** One turn with an NPC through POST /npc/:npcId/interact. */
export async function converse(text: string, intent: Intent, opening = false) {
  const dialog = game.state.dialogue
  if (!dialog || (!opening && dialog.thinking) || !text.trim()) return
  const { sessionId, pending, position } = game.state
  const requestId = dialog.requestId
  const history =
    opening || intent !== 'chat'
      ? dialog.history
      : [...dialog.history, { role: 'user' as const, content: text }]
  update({ dialogue: { ...dialog, history, thinking: true }, pending: [] })
  const nearbyNpcs = (Object.keys(PEOPLE) as NpcId[]).filter(
    (id) => id !== dialog.npc && distance(PEOPLE[id].at, position) < 12
  )
  const result = await mutate(() =>
    interactWith(
      dialog.npc,
      {
        playerId: sessionId,
        message: text.slice(0, 500),
        intent,
        events: pending,
        worldContext: {
          playerLocation: game.state.world.locationId,
          nearbyNpcs,
          timeOfDay: timeOfDay(),
        },
      },
      game.state
    )
  )
  if (
    game.state.sessionId !== sessionId ||
    game.state.dialogue?.requestId !== requestId
  )
    return
  apply(result, dialog.npc, history)
}

function apply(
  result: InteractResponse,
  npc: NpcId,
  history: { role: 'user' | 'assistant'; content: string }[]
) {
  const event = result.questEvent
  game.setState((state) => {
    let next: GameState = {
      ...state,
      // Server state is authoritative; keep only local fields it does not own.
      world: { ...result.world, locationId: state.world.locationId },
      quest: result.quest,
      source: result.source,
      lastLine: { ...state.lastLine, [npc]: result.reply },
    }
    if (event?.type === 'offered' && !state.quest)
      next = { ...next, quest: event.quest }
    if (event?.type === 'completed') {
      const rewarded = grantReward(
        { ...state, quest: event.quest },
        event.quest
      )
      next = {
        ...next,
        completed: rewarded.completed,
        reward: event.reward.currency,
        reputation: rewarded.reputation,
        panel: 'reward',
        dialogue: null,
        quest: null,
      }
      return next
    }
    return {
      ...next,
      dialogue: state.dialogue && {
        ...state.dialogue,
        thinking: false,
        source: result.source,
        history: [
          ...history,
          { role: 'assistant' as const, content: result.reply },
        ].slice(-12),
      },
    }
  })
  if (event?.type === 'offered') {
    audio.play('pickup')
    notify('Fresh herbs tucked into your bag')
  }
  if (event?.type === 'completed') audio.play('reward')
}
