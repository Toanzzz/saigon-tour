import { NPCS, type NpcId, type Quest, type QuestStep } from '@saigon/shared'
import { type GameState, trackedQuest } from './game'

export function nextStep(quest: Quest): QuestStep | undefined {
  return quest.steps.find((_, index) => !quest.progress[index])
}
export function stepCopy(step: QuestStep): string {
  switch (step.type) {
    case 'GO_TO':
      return `Visit ${step.locationId}.`
    case 'TALK_TO':
      return `Talk to ${NPCS[step.npcId].name}.`
    case 'DELIVER':
      return `Give ${step.itemId} to ${NPCS[step.npcId].name}.`
    case 'BUY':
      return `Buy ${step.marketItemId} at the market.`
  }
}
export function questHint(quest: Quest): string {
  const step = nextStep(quest)
  return step
    ? stepCopy(step)
    : `Return to ${NPCS[quest.giverNpcId].name} for your thank-you.`
}
export function questTarget(state: GameState): NpcId | null {
  const quest = trackedQuest(state)
  if (!quest) return null
  const step = nextStep(quest)
  return step && (step.type === 'DELIVER' || step.type === 'TALK_TO')
    ? step.npcId
    : quest.giverNpcId
}
export function dialogueQuests(state: GameState, npc: NpcId) {
  const delivery = state.quests.flatMap((quest) => {
    const step = nextStep(quest)
    return step?.type === 'DELIVER' &&
      step.npcId === npc &&
      (state.world.inventory[step.itemId] ?? 0) > 0
      ? [step]
      : []
  })[0]
  return {
    delivery,
    ready: state.quests.some(
      (quest) => quest.giverNpcId === npc && quest.status === 'ready'
    ),
    canHelp: state.quests.length < 3,
  }
}
