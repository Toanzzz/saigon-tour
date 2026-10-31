import {
  DEMO_QUEST,
  type NpcId,
  type Quest,
  SECRET_QUESTS,
  TEAM_QUEST,
} from '@saigon/shared'

/** Quest templates the agents may offer. Rewards are fixed here, not by models. */
const TEMPLATES: Record<string, Quest> = {
  [DEMO_QUEST.id]: DEMO_QUEST,
  [TEAM_QUEST.id]: TEAM_QUEST,
  ...SECRET_QUESTS,
}

export const questTemplate = (id: string): Quest | undefined =>
  TEMPLATES[id] ? structuredClone(TEMPLATES[id]) : undefined

export const templatesFor = (npcId: Quest['giverNpcId']) =>
  Object.values(TEMPLATES).filter((quest) => quest.giverNpcId === npcId)

/** The quest a player should hear when they ask a wandering NPC for a secret. */
export const secretQuestFor = (npcId: NpcId): Quest | undefined =>
  templatesFor(npcId).find((quest) => quest.id !== TEAM_QUEST.id)
