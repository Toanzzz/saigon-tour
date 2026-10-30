import { DEMO_QUEST, type Quest, TEAM_QUEST } from '@saigon/shared'

/** Quest templates the agents may offer. Rewards are fixed here, not by models. */
const TEMPLATES: Record<string, Quest> = {
  [DEMO_QUEST.id]: DEMO_QUEST,
  [TEAM_QUEST.id]: TEAM_QUEST,
}

export const questTemplate = (id: string): Quest | undefined =>
  TEMPLATES[id] ? structuredClone(TEMPLATES[id]) : undefined

export const templatesFor = (npcId: Quest['giverNpcId']) =>
  Object.values(TEMPLATES).filter((quest) => quest.giverNpcId === npcId)
