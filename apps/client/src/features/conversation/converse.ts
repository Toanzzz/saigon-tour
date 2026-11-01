import {
  advance,
  applyQuestEvents,
  type InteractResponse,
  type ItemId,
  type NpcId,
  type TimeOfDay,
} from '@saigon/shared'
import { interactWith, queryClient } from '@/shared/api/agent'
import { beginHttpTurn, endHttpTurn } from '@/shared/api/events'
import { net, updateNet } from '@/shared/api/status'
import { audio } from '@/shared/audio'
import { type GameState, game, notify, update } from '@/shared/state/game'
import { distance, PEOPLE } from '@/shared/world/places'

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
  const events = result.questEvents
  if (synced && net.state.partyVersion === partyVersion)
    updateNet({ party: result.party })
  let offered = false
  let completed = false
  game.setState((state) => {
    if (result.revision < state.serverRevision) {
      return state.dialogue?.requestId === requestId
        ? { ...state, dialogue: { ...state.dialogue, thinking: false } }
        : state
    }
    let next: GameState = {
      ...state,
      serverRevision: synced ? result.revision : state.serverRevision,
      ...applyQuestEvents(result.world, result.quests, state.pending),
      trackedQuestId: result.quests.some(
        (quest) => quest.id === state.trackedQuestId
      )
        ? state.trackedQuestId
        : (result.quests[0]?.id ?? null),
      source: result.source,
      lastLine: { ...state.lastLine, [npc]: result.reply },
    }
    offered = events.some(
      (event) =>
        event.type === 'offered' &&
        !state.quests.some((quest) => quest.id === event.quest.id)
    )
    const rewards = events.filter(
      (event) =>
        event.type === 'completed' &&
        !state.completed.some((quest) => quest.id === event.quest.id)
    )
    if (rewards.length) {
      completed = true
      const event = rewards[rewards.length - 1]
      next = {
        ...next,
        completed: [
          ...state.completed,
          ...rewards.map(({ quest, reward }) => ({
            id: quest.id,
            title: quest.title,
            giverNpcId: quest.giverNpcId,
            reward,
            completedAt: Date.now(),
          })),
        ],
        reward: rewards.reduce(
          (total, entry) => total + entry.reward.currency,
          0
        ),
        rewardQuest: event.quest,
        reputation:
          state.reputation +
          rewards.reduce((total, entry) => total + entry.reward.reputation, 0),
        panel: 'reward',
        dialogue: null,
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
    notify('An errand was added to your journal.')
  }
  if (completed) audio.play('reward')
}
