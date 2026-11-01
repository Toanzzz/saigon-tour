import {
  MARKET_ITEMS,
  NPCS,
  type NpcId,
  type Quest,
  type QuestStep,
} from '@saigon/shared'
import { itemLabel, m } from '@/shared/i18n'
import { placeName } from '@/shared/world/places'
import { type GameState, trackedQuest } from './game'

export function nextStep(quest: Quest): QuestStep | undefined {
  return quest.steps.find((_, index) => !quest.progress[index])
}
export function stepCopy(step: QuestStep): string {
  switch (step.type) {
    case 'GO_TO':
      return m.step_visit({ place: placeName(step.locationId) })
    case 'TALK_TO':
      return m.step_talk({ name: NPCS[step.npcId].name })
    case 'DELIVER':
      return m.step_give({
        item: itemLabel(step.itemId),
        name: NPCS[step.npcId].name,
      })
    case 'BUY':
      return m.step_buy({ item: MARKET_ITEMS[step.marketItemId].label })
  }
}
export function questHint(quest: Quest): string {
  const step = nextStep(quest)
  return step
    ? stepCopy(step)
    : m.step_return({ name: NPCS[quest.giverNpcId].name })
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
  const fromNpc = state.quests.filter(
    (quest) =>
      quest.giverNpcId === npc &&
      (quest.status === 'active' || quest.status === 'ready')
  )
  const forNpc = state.quests.filter((quest) => {
    if (quest.giverNpcId === npc) return false
    const step = nextStep(quest)
    return (
      (step?.type === 'DELIVER' || step?.type === 'TALK_TO') &&
      step.npcId === npc
    )
  })
  return {
    delivery,
    fromNpc,
    forNpc,
    ready: state.quests.some(
      (quest) => quest.giverNpcId === npc && quest.status === 'ready'
    ),
    canHelp: state.quests.length < 3,
    full: state.quests.length >= 3,
  }
}
