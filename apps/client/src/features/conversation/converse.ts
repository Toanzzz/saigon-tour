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
import { appendHistory } from '@/shared/api/history'
import { net, updateNet } from '@/shared/api/status'
import { audio } from '@/shared/audio'
import { m } from '@/shared/i18n'
import { noteFriendship } from '@/shared/state/friendship'
import {
  type ChatMessage,
  celebrate,
  type GameState,
  game,
  notify,
  update,
} from '@/shared/state/game'
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

function apply(
  result: InteractResponse,
  npc: NpcId,
  history: ChatMessage[],
  requestId: string,
  synced: boolean,
  partyVersion: number
) {
  if (result.revision >= game.state.serverRevision)
    noteFriendship(
      game.state.friendship,
      result.friendship,
      result.friendshipEvents
    )
  for (const event of result.questEvents)
    if (event.type === 'failed')
      notify(m.quest_failed({ title: event.quest.title }))
  const events = result.questEvents
  if (synced && net.state.partyVersion === partyVersion)
    updateNet({ party: result.party })
  let offered = false
  let completed = false
  let milestoneBegan = false
  game.setState((state) => {
    if (result.revision < state.serverRevision) {
      return state.dialogue?.requestId === requestId
        ? {
            ...state,
            dialogue: {
              ...state.dialogue,
              thinking: false,
              streamingText: undefined,
            },
          }
        : state
    }
    let next: GameState = {
      ...state,
      friendship: result.friendship,
      serverRevision: synced ? result.revision : state.serverRevision,
      ...applyQuestEvents(result.world, result.quests, state.pending),
      trackedQuestId: result.quests.some(
        (quest) => quest.id === state.trackedQuestId
      )
        ? state.trackedQuestId
        : (result.quests[0]?.id ?? null),
      source: result.source,
      lastLine: result.reply
        ? { ...state.lastLine, [npc]: result.reply }
        : state.lastLine,
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
      milestoneBegan = rewards.some((entry) => entry.quest.milestone)
      const event = rewards[rewards.length - 1]
      const owned = new Set(state.unlocks.owned)
      for (const entry of rewards)
        if (entry.reward.unlockId) owned.add(entry.reward.unlockId)
      next = {
        ...next,
        unlocks: { ...state.unlocks, owned: [...owned] },
        completed: [
          ...state.completed,
          ...rewards.map(({ quest, reward }) => ({
            id: quest.id,
            title: quest.title,
            giverNpcId: quest.giverNpcId,
            reward,
            completedAt: Date.now(),
            ...(quest.milestone ? { milestone: quest.milestone } : {}),
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
              streamingText: undefined,
              source: result.source,
              history: history.slice(-30),
              earlierCount: Math.max(
                0,
                (state.dialogue.earlierCount ?? 0) -
                  Math.max(0, history.length - 30)
              ),
            }
          : state.dialogue,
    }
  })
  if (offered) {
    audio.play('accept')
    celebrate('accepted')
    notify(m.toast_errand_added())
  }
  if (completed) {
    audio.play('reward')
    celebrate('completed')
  }
  if (milestoneBegan) notify(m.milestone_begins_toast())
}
