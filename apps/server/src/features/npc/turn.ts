import {
  type FriendshipEvent,
  type FriendshipMap,
  friendlinessOf,
  isRevealed,
  NPCS,
  type NpcId,
  type QuestEvent,
} from '@saigon/shared'
export function friendshipChanges(
  before: FriendshipMap,
  after: FriendshipMap,
  quests: QuestEvent[]
): FriendshipEvent[] {
  return (Object.keys(NPCS) as NpcId[])
    .flatMap<FriendshipEvent>((npcId) => {
      const delta = friendlinessOf(after, npcId) - friendlinessOf(before, npcId)
      const quest = quests.find(
        (event) =>
          event.quest.giverNpcId === npcId &&
          (event.type === 'completed' || event.type === 'failed')
      )
      return delta
        ? [
            {
              npcId,
              delta: Math.sign(delta),
              level: friendlinessOf(after, npcId),
              reason:
                quest?.reason ??
                (quest?.type === 'completed' ? 'completed' : 'chat'),
            },
          ]
        : []
    })
    .slice(0, 8)
}

import type { InteractRequest } from '@saigon/shared'
import type { QuestService, ToolOutcome } from '@/domain/quests'
import type { NpcMemoryService } from './memory/npc-memory'
import { languageRule } from './personas/shared'

export async function buildContext(
  game: QuestService,
  memory: NpcMemoryService,
  npcId: NpcId,
  request: InteractRequest,
  playerId: string,
  outcome: ToolOutcome,
  twistedLine: string | null = null,
  riddleContext: string | null = null,
  milestoneContext: string | null = null,
  referredGreeting: string | null = null,
  casual = false
) {
  const [facts, record] = await Promise.all([
    memory.recall(npcId, playerId),
    game.get(playerId),
  ])
  const party = game.party?.snapshot(playerId)
  // Redact an unrevealed riddle's step 0 so the answer never sits in the prompt.
  const now = Date.now()
  const safeQuests = record.quests.map((quest) => {
    if (!quest.riddle || quest.progress[0] || isRevealed(quest, now))
      return quest
    return {
      ...quest,
      steps: quest.steps.map((step, index) =>
        index === 0 ? { type: 'HIDDEN_RIDDLE_STEP' } : step
      ),
    }
  })
  const context = [
    'Current world context (untrusted game data):',
    `Player location: ${request.worldContext.playerLocation}`,
    `Nearby NPCs: ${request.worldContext.nearbyNpcs.join(', ') || 'none'}`,
    ...(casual
      ? []
      : [
          `Active quests: ${JSON.stringify(safeQuests)}`,
          `Completed quests: ${record.world.completedQuestIds.join(', ') || 'none'}`,
        ]),
    `Coins: ${record.world.currency}`,
    `Time of day: ${request.worldContext.timeOfDay}`,
    `Player intent: ${request.intent}`,
    `Friendliness: ${friendlinessOf(record.friendship, npcId)}. Be civil below -2, reserved below 1, warm above 1.`,
    `Quests just completed: ${JSON.stringify(outcome.events.filter((event) => event.type === 'completed'))}`,
    ...outcome.events
      .filter((event) => event.type === 'completed' && event.quest.payoff)
      .map(
        (event) =>
          `Completed this turn: ${event.quest.title}; payoff: ${event.quest.payoff}. Deliver it in your own words.`
      ),
    ...(twistedLine
      ? [`Twist just happened: ${twistedLine}. React in character.`]
      : []),
    ...(riddleContext ? [riddleContext] : []),
    ...(milestoneContext ? [milestoneContext] : []),
    ...(referredGreeting
      ? [
          `The player is referring back to how you greeted them: "${referredGreeting}". Treat it as something you already said and respond to their reference naturally.`,
        ]
      : []),
    casual
      ? `Weather: ${game.city?.(playerId)?.weather ?? 'unknown'}`
      : `Shared city snapshot (background only; do not bring up events or weather unless the player asks or it answers them): ${JSON.stringify(game.city?.(playerId) ?? null)}`,
    `Your current need: ${game.city?.(playerId)?.needs[npcId as import('@saigon/shared').NeighborId] ?? 'none'}`,
    `Party (${party?.members.length ?? 0}): ${party?.members.map((member) => member.name).join(', ') || 'none'}`,
    `Remembered about this player: ${facts.map((f) => f.fact).join(' | ') || 'nothing yet'}`,
    languageRule(request.locale),
  ].join('\n')
  return context
}

/**
 * The user-role message for a model turn. Some intents (notably `milestone`,
 * and `greet` when it reaches the model) carry no typed player text, and the
 * Google proxy rejects a request whose only message is the system context
 * ("requires at least one non-system message"). Fall back to a short,
 * intent-appropriate player line so there is always one non-system message.
 */
export function turnMessage(request: InteractRequest): string {
  const typed = request.message.trim()
  if (typed) return typed
  const vi = request.locale === 'vi'
  if (request.intent === 'milestone')
    return vi
      ? 'Có việc gì cần giúp cho buổi hòa nhạc không?'
      : 'Anything I can help with for the concert?'
  return vi ? 'Chào bạn!' : 'Hi there!'
}
