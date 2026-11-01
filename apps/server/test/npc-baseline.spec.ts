import {
  CITY_ANCHORS,
  GIVER_UNLOCKS,
  NEIGHBOR_IDS,
  NPC_NAMES,
  NPC_POSITIONS,
  NPCS,
  npcText,
  QUEST_DOMAINS,
  QUEST_SEEDS,
  RESIDENT_ANCHORS,
  RESIDENT_IDS,
  seedsFor,
  UNLOCKS,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { npcInstructions } from '@/features/npc'

/**
 * Regression baseline for the per-NPC package migration. Every shared NPC table
 * and every composed agent prompt is captured here on the current code, so the
 * refactor that moves this data into `packages/npc-*` must reproduce it exactly.
 * Byte-identical prompts also keep the greeting cache valid.
 */
describe('npc baseline', () => {
  const allIds = [...NEIGHBOR_IDS, ...RESIDENT_IDS]

  it('shared NPC tables are unchanged', () => {
    expect({
      NPCS,
      NPC_NAMES,
      NPC_POSITIONS,
      CITY_ANCHORS,
      RESIDENT_ANCHORS,
      QUEST_DOMAINS,
      QUEST_SEEDS,
      GIVER_UNLOCKS,
      UNLOCKS,
    }).toMatchSnapshot()
  })

  it('localized npc text is unchanged', () => {
    const text = Object.fromEntries(
      allIds.map((id) => [id, { en: npcText(id, 'en'), vi: npcText(id, 'vi') }])
    )
    expect(text).toMatchSnapshot()
  })

  it('quest seeds per npc are unchanged', () => {
    const seeds = Object.fromEntries(
      allIds.map((id) => [
        id,
        { en: seedsFor(id, 'en'), vi: seedsFor(id, 'vi') },
      ])
    )
    expect(seeds).toMatchSnapshot()
  })

  it('composed agent prompts are unchanged', () => {
    const prompts = Object.fromEntries(
      allIds.map((id) => [id, npcInstructions(id)])
    )
    expect(prompts).toMatchSnapshot()
  })
})
