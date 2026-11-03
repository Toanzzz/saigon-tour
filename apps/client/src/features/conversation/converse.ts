import {
  advance,
  type ItemId,
  type NpcId,
  type TimeOfDay,
} from '@saigon/shared'
import { interactWith, queryClient } from '@/shared/api/agent'
import { beginHttpTurn, endHttpTurn } from '@/shared/api/events'
import { appendHistory } from '@/shared/api/history'
import { net } from '@/shared/api/status'
import { type GameState, game, update } from '@/shared/state/game'
import { applyResponse as apply } from './apply-response'
import { nearbyNpcs } from './nearby'

export type Intent = 'chat' | 'open' | 'greet' | 'milestone'

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
        ...new Set([
          ...state.world.deliveredItems,
          `${itemId}:${npc}` as const,
        ]),
      ],
    },
    quests: state.quests.map((quest) =>
      advance(quest, { type: 'deliver', itemId, npcId: npc })
    ),
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
  if (
    !dialog ||
    (!opening && dialog.thinking) ||
    (intent !== 'open' &&
      intent !== 'greet' &&
      intent !== 'milestone' &&
      !text.trim())
  )
    return
  const messageId = crypto.randomUUID()
  const sentAt = new Date().toISOString()
  update({ dialogue: { ...dialog, thinking: true, streamingText: undefined } })
  const session = game.state.sessionId
  const canSend = await beginHttpTurn()
  if (
    !canSend ||
    game.state.sessionId !== session ||
    game.state.dialogue?.requestId !== dialog.requestId
  ) {
    if (canSend) endHttpTurn()
    if (game.state.dialogue?.requestId === dialog.requestId)
      update({ dialogue: { ...game.state.dialogue, thinking: false } })
    return
  }
  const snapshot = game.state
  const { sessionId, pending, position } = snapshot
  const sentEvents = pending.slice(0, 16)
  const partyVersion = net.state.partyVersion
  const requestId = dialog.requestId
  const history =
    opening || intent !== 'chat'
      ? dialog.history
      : [
          ...dialog.history,
          {
            id: messageId,
            at: sentAt,
            role: 'user' as const,
            content: text.slice(0, 500),
          },
        ]
  update({
    dialogue: { ...dialog, history, thinking: true, streamingText: undefined },
    pending: pending.slice(sentEvents.length),
  })
  const result = await mutate(() =>
    interactWith(
      dialog.npc,
      {
        message: text.slice(0, 500),
        intent,
        messageId,
        sentAt,
        ...(game.state.guestName
          ? { playerName: game.state.guestName.slice(0, 60) }
          : {}),
        events: sentEvents,
        worldContext: {
          playerLocation: game.state.world.locationId,
          nearbyNpcs: nearbyNpcs(dialog.npc, position),
          timeOfDay: timeOfDay(),
        },
      },
      snapshot,
      (streamingText) => {
        const current = game.state.dialogue
        if (
          game.state.sessionId === sessionId &&
          current?.requestId === requestId
        )
          update({ dialogue: { ...current, streamingText } })
      }
    )
  )
  endHttpTurn()
  if (game.state.sessionId !== sessionId) return
  const turnMessages = appendHistory(
    dialog.npc,
    text.slice(0, 500),
    result.response.reply,
    false,
    {
      messageId,
      sentAt,
      messages: result.response.messages,
    }
  )
  apply(
    result.response,
    dialog.npc,
    [...dialog.history, ...turnMessages],
    requestId,
    result.synced,
    partyVersion
  )
  if (!result.synced)
    game.setState((state) => ({
      ...state,
      pending: [...sentEvents, ...state.pending],
    }))
}
