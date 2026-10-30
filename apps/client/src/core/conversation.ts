import {
  applyPlayerEvents,
  type InteractResponse,
  type ItemId,
  type NpcId,
  type TimeOfDay,
} from '@saigon/shared'
import { audio } from '../audio'
import { interactWith, queryClient } from '../net/agent'
import { beginHttpTurn, endHttpTurn } from '../net/events'
import {
  type GameState,
  game,
  grantReward,
  notify,
  update,
} from '../state/game'
import { distance, PEOPLE } from './places'

export type Intent = 'chat' | 'help' | 'check' | 'greet'

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
  update({ dialogue: { ...dialog, thinking: true } })
  const session = game.state.sessionId
  const canSend = await beginHttpTurn()
  if (
    !canSend ||
    game.state.sessionId !== session ||
    game.state.dialogue?.requestId !== dialog.requestId
  ) {
    endHttpTurn()
    if (game.state.dialogue?.requestId === dialog.requestId)
      update({ dialogue: { ...game.state.dialogue, thinking: false } })
    return
  }
  const snapshot = game.state
  const { sessionId, pending, position } = snapshot
  const sentEvents = pending.slice(0, 16)
  const requestId = dialog.requestId
  const history =
    opening || intent !== 'chat'
      ? dialog.history
      : [...dialog.history, { role: 'user' as const, content: text }]
  update({
    dialogue: { ...dialog, history, thinking: true },
    pending: pending.slice(sentEvents.length),
  })
  const nearbyNpcs = (Object.keys(PEOPLE) as NpcId[]).filter(
    (id) => id !== dialog.npc && distance(PEOPLE[id].at, position) < 12
  )
  const result = await mutate(() =>
    interactWith(
      dialog.npc,
      {
        message: text.slice(0, 500),
        intent,
        events: sentEvents,
        worldContext: {
          playerLocation: game.state.world.locationId,
          nearbyNpcs,
          timeOfDay: timeOfDay(),
        },
      },
      snapshot
    )
  )
  endHttpTurn()
  if (game.state.sessionId !== sessionId) return
  apply(result.response, dialog.npc, history, requestId)
  if (!result.synced)
    game.setState((state) => ({
      ...state,
      pending: [...sentEvents, ...state.pending],
    }))
}

function apply(
  result: InteractResponse,
  npc: NpcId,
  history: { role: 'user' | 'assistant'; content: string }[],
  requestId: string
) {
  const event = result.questEvent
  game.setState((state) => {
    if (state.dialogue?.requestId !== requestId) return state
    let next: GameState = {
      ...state,
      world: applyPlayerEvents(result.world, state.pending),
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
      dialogue:
        state.dialogue?.requestId === requestId
          ? {
              ...state.dialogue,
              thinking: false,
              source: result.source,
              history: [
                ...history,
                { role: 'assistant' as const, content: result.reply },
              ].slice(-12),
            }
          : state.dialogue,
    }
  })
  if (event?.type === 'offered') {
    audio.play('pickup')
    notify('Fresh herbs tucked into your bag')
  }
  if (event?.type === 'completed') audio.play('reward')
}
