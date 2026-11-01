import { createQuest, type NpcId, type Quest, seedsFor } from '@saigon/shared'

/**
 * A stable single-step delivery quest for UI/state tests. Item-specific on
 * purpose so content changes to the real seeds never ripple into these tests.
 * Pass an npcId to use that NPC's first real seed instead.
 */
export function questFixture(npcId?: NpcId, id?: string): Quest {
  if (npcId) {
    const spec = seedsFor(npcId)[0]
    if (!spec) throw new Error(`Missing quest seed for ${npcId}`)
    return createQuest(spec, id ?? `q_test_${npcId}`, Date.now())
  }
  return createQuest(
    {
      giverNpcId: 'hoa',
      title: 'Fresh herbs for a neighbor',
      description: 'Bring these fresh herbs to Linh in the park.',
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
    },
    id ?? 'q_test_hoa',
    Date.now()
  )
}
/** A single-step GO_TO alley quest; a visit to the alley makes it ready. */
export function visitFixture(id = 'q_test_visit'): Quest {
  return createQuest(
    {
      giverNpcId: 'vy',
      title: 'An evening walk',
      description: 'Visit the food alley and look for a welcoming corner.',
      scope: 'solo',
      steps: [{ type: 'GO_TO', locationId: 'alley' }],
    },
    id,
    Date.now()
  )
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
