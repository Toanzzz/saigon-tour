import {
  applyPlayerEvents,
  type InteractResponse,
  type ItemId,
  type NpcId,
  TEAM_QUEST,
  type TimeOfDay,
} from '@saigon/shared'
import { interactWith, queryClient } from '@/shared/api/agent'
import { beginHttpTurn, endHttpTurn } from '@/shared/api/events'
import { net, updateNet } from '@/shared/api/status'
import { audio } from '@/shared/audio'
import { type GameState, game, notify, update } from '@/shared/state/game'
import { distance, PEOPLE } from '@/shared/world/places'

export type Intent = 'chat' | 'help' | 'check' | 'greet' | 'team'

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
  apply(
    result.response,
    dialog.npc,
    history,
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

function apply(
  result: InteractResponse,
  npc: NpcId,
  history: { role: 'user' | 'assistant'; content: string }[],
  requestId: string,
  synced: boolean,
  partyVersion: number
) {
  const event = result.questEvent
  if (synced && net.state.partyVersion === partyVersion)
    updateNet({ party: result.party })
  let offered = false
  let completed = false
  const teamEvent = event?.quest.id === TEAM_QUEST.id
  game.setState((state) => {
    if (result.revision < state.serverRevision) {
      return state.dialogue?.requestId === requestId
        ? { ...state, dialogue: { ...state.dialogue, thinking: false } }
        : state
    }
    let next: GameState = {
      ...state,
      serverRevision: synced ? result.revision : state.serverRevision,
      world: applyPlayerEvents(result.world, state.pending),
      quest: result.quest,
      source: result.source,
      lastLine: { ...state.lastLine, [npc]: result.reply },
    }
    offered =
      event?.type === 'offered' &&
      !state.quest &&
      !state.completed.some((quest) => quest.id === event.quest.id)
    if (offered && event && !teamEvent) next.quest = event.quest
    if (
      event?.type === 'completed' &&
      !state.completed.some((quest) => quest.id === event.quest.id)
    ) {
      completed = true
      const rewarded = {
        completed: [...state.completed, event.quest],
        reputation: state.reputation + event.reward.reputation,
      }
      next = {
        ...next,
        completed: rewarded.completed,
        reward: event.reward.currency,
        rewardQuest: event.quest,
        reputation: rewarded.reputation,
        panel: 'reward',
        dialogue: null,
        quest: teamEvent ? result.quest : null,
        screen: 'playing',
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
  if (offered) {
    audio.play('pickup')
    notify(
      teamEvent
        ? 'Team dishes assigned. See your travel journal.'
        : 'Fresh herbs tucked into your bag'
    )
  }
  if (completed) audio.play('reward')
}
