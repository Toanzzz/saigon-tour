import { createQuest, type NpcId, type Quest, seedsFor } from '@saigon/shared'

export function questFixture(
  npcId: NpcId = 'hoa',
  id = `q_test_${npcId}`
): Quest {
  const spec = seedsFor(npcId)[0]
  if (!spec) throw new Error(`Missing quest seed for ${npcId}`)
  return createQuest(spec, id, Date.now())
}
export function completedFixture(quest: Quest) {
  return {
    id: quest.id,
    title: quest.title,
    giverNpcId: quest.giverNpcId,
    reward: quest.reward,
    completedAt: 2000,
  }
}
