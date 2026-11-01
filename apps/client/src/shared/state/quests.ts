import {
  canOfferQuests,
  isRevealed,
  MILESTONES,
  milestoneForGiver,
  type NpcId,
  type Quest,
  type QuestStep,
} from '@saigon/shared'
import { npcPlacement } from '@/shared/api/city'
import { itemLabel, m, marketItemLabel, npcLabel } from '@/shared/i18n'
import { clock } from '@/shared/state/ui'
import { placeName } from '@/shared/world/places'
import { type GameState, trackedQuest } from './game'

export function nextStep(quest: Quest): QuestStep | undefined {
  return quest.steps.find((_, index) => !quest.progress[index])
}

/** Appends "· now at {place}" when a people-step's NPC left its home. */
function movedSuffix(step: QuestStep): string {
  if (
    step.type !== 'TALK_TO' &&
    step.type !== 'DELIVER' &&
    step.type !== 'BRING'
  )
    return ''
  const here = npcPlacement(step.npcId)
  if (!here) return ''
  return ` ${m.step_now_at({ place: placeName(here) })}`
}

export function stepCopy(step: QuestStep): string {
  switch (step.type) {
    case 'GO_TO':
      return m.step_visit({ place: placeName(step.locationId) })
    case 'TALK_TO':
      return m.step_talk({ name: npcLabel(step.npcId) }) + movedSuffix(step)
    case 'DELIVER':
      return (
        m.step_give({
          item: itemLabel(step.itemId),
          name: npcLabel(step.npcId),
        }) + movedSuffix(step)
      )
    case 'BUY':
      return m.step_buy({ item: marketItemLabel(step.marketItemId) })
    case 'BRING':
      return (
        m.step_bring({
          item: itemLabel(step.itemId),
          name: npcLabel(step.npcId),
        }) + movedSuffix(step)
      )
  }
}

/** The riddle's step 0 is hidden until the city reveals it. */
function hiddenRiddle(quest: Quest): string | null {
  if (!quest.riddle) return null
  return isRevealed(quest, clock.state.now) ? null : quest.riddle.text
}

/**
 * The journal/hub line for a quest's step at `index`. Returns the riddle text
 * for a hidden step 0 so no screen leaks the answer; otherwise the plain copy.
 */
export function stepLine(quest: Quest, index: number): string {
  const step = quest.steps[index]
  if (!step) return ''
  if (index === 0) {
    const hidden = hiddenRiddle(quest)
    if (hidden) return hidden
  }
  return stepCopy(step)
}

export function questHint(quest: Quest): string {
  const hidden = hiddenRiddle(quest)
  if (hidden) return hidden
  const step = nextStep(quest)
  return step
    ? stepCopy(step)
    : m.step_return({ name: npcLabel(quest.giverNpcId) })
}
export function questTarget(state: GameState): NpcId | null {
  const quest = trackedQuest(state)
  if (!quest) return null
  if (hiddenRiddle(quest)) return null
  const step = nextStep(quest)
  return step &&
    (step.type === 'DELIVER' ||
      step.type === 'TALK_TO' ||
      step.type === 'BRING')
    ? step.npcId
    : quest.giverNpcId
}
export function dialogueQuests(state: GameState, npc: NpcId) {
  const delivery = state.quests.flatMap((quest) => {
    const step = nextStep(quest)
    return (step?.type === 'DELIVER' || step?.type === 'BRING') &&
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

/**
 * Would the milestone "Ask about the concert" button apply for this giver?
 * Mirrors the server's offerMilestone gating from local state.
 */
export function canAskMilestone(state: GameState, npc: NpcId): boolean {
  const milestoneId = milestoneForGiver(npc)
  if (!milestoneId) return false
  // Match the server gate: a cold giver offers nothing.
  if (!canOfferQuests(state.friendship, npc)) return false
  const component = MILESTONES[milestoneId].components.find(
    (entry) => entry.giver === npc
  )
  if (!component) return false
  if (state.completed.some((quest) => quest.milestone === milestoneId))
    return false
  if ((state.world.inventory[component.itemId] ?? 0) > 0) return false
  return !state.quests.some(
    (quest) =>
      quest.giverNpcId === npc &&
      quest.milestone === milestoneId &&
      quest.status !== 'completed'
  )
}
