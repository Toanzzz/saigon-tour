import {
  type InteractRequest,
  type NpcId,
  type QuestEvent,
  stepText,
  ZERO_REWARD,
} from '@saigon/shared'
import { completeReady, type QuestService } from '@/domain/quests'

/** Apply the encounter and collect authored reactions before choosing a reply. */
export async function prepareEncounter(
  game: QuestService,
  npcId: NpcId,
  request: InteractRequest,
  playerId: string
) {
  const previous = await game.get(playerId)
  const record = await game.applyEvents(
    playerId,
    [
      ...request.events,
      { type: 'talk', npcId },
      { type: 'visit', locationId: request.worldContext.playerLocation },
    ],
    npcId
  )
  const progressEvents: QuestEvent[] = record.quests
    .filter((quest) => {
      const before = previous.quests.find((entry) => entry.id === quest.id)
      return (
        before &&
        quest.progress.some((done, index) => done !== before.progress[index])
      )
    })
    .map((quest) => ({ type: 'progress', quest, reward: ZERO_REWARD }))
  const completed = await completeReady(game, playerId, npcId)
  progressEvents.push(...record.questEvents, ...completed)
  const current = await game.get(playerId)
  // The completed quest's authored punchline, delivered on return.
  const completedPayoff = completed
    .map((event) => event.quest.payoff)
    .find((payoff): payoff is string => Boolean(payoff))
  // A twist that applied during this turn's events is spoken by the NPC where
  // it triggered (the Sho TALK_TO target), which is the NPC being greeted now.
  const twistedLine = record.quests
    .map((quest) => {
      const before = previous.quests.find((entry) => entry.id === quest.id)
      return quest.twist?.replaced && !before?.twist?.replaced
        ? quest.twist.line
        : null
    })
    .find((line): line is string => Boolean(line))
  // A riddle revealed by this greet's talk is spoken as the authored reveal.
  const riddleRevealLine = record.quests
    .map((quest) => {
      const before = previous.quests.find((entry) => entry.id === quest.id)
      const first = quest.steps[0]
      return quest.riddle && first && quest.revealed && !before?.revealed
        ? stepText(first, request.locale)
        : null
    })
    .find((answer): answer is string => Boolean(answer))
  // Chat-path riddle context for this giver: hint-only while hidden, or an
  // instruction to voice the answer on the turn it was revealed.
  const giverRiddle = record.quests.find(
    (quest) => quest.giverNpcId === npcId && quest.riddle && !quest.progress[0]
  )
  const giverRiddleBefore = giverRiddle
    ? previous.quests.find((entry) => entry.id === giverRiddle.id)
    : undefined
  const first = giverRiddle?.steps[0]
  let riddleContext: string | null = null
  if (giverRiddle && first) {
    if (giverRiddle.revealed && !giverRiddleBefore?.revealed)
      riddleContext = `You just told the player the riddle answer: ${stepText(first, request.locale)}. Say it in your voice.`
    else if (!giverRiddle.revealed && giverRiddle.riddle)
      riddleContext = `Riddle unrevealed: ${giverRiddle.riddle.text}. Hint, never answer.`
  }
  return {
    previous,
    current,
    progressEvents,
    completed,
    completedPayoff,
    twistedLine,
    riddleRevealLine,
    riddleContext,
  }
}
