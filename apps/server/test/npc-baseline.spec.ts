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
 * and every composed agent prompt is captured here, so the refactor that moves
 * this data into `packages/npc-*` must reproduce it exactly. Values are
 * canonicalized (keys sorted) so the snapshot is insensitive to registry
 * iteration order; only the data content is the regression guard. Byte-identical
 * prompts also keep the greeting cache valid.
 */

/** Deep-sort object keys so serialization ignores insertion order. */
function canon(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canon)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canon(v)])
    )
  }
  return value
}

/** Seeds carry no stable id of their own; sort by giver then title for determinism. */
function sortedSeeds() {
  return [...QUEST_SEEDS]
    .map(
      (s) => canon(s) as { giverNpcId: string; text: { en: { title: string } } }
    )
    .sort((a, b) =>
      `${a.giverNpcId}:${a.text.en.title}`.localeCompare(
        `${b.giverNpcId}:${b.text.en.title}`
      )
    )
}

describe('npc baseline', () => {
  const allIds = [...NEIGHBOR_IDS, ...RESIDENT_IDS]

  it('shared NPC tables are unchanged', () => {
    expect(
      canon({
        NPCS,
        NPC_NAMES,
        NPC_POSITIONS,
        CITY_ANCHORS,
        RESIDENT_ANCHORS,
        QUEST_DOMAINS,
        QUEST_SEEDS: sortedSeeds(),
        GIVER_UNLOCKS,
        UNLOCKS,
      })
    ).toMatchSnapshot()
  })

  it('localized npc text is unchanged', () => {
    const text = Object.fromEntries(
      allIds.map((id) => [id, { en: npcText(id, 'en'), vi: npcText(id, 'vi') }])
    )
    expect(canon(text)).toMatchSnapshot()
  })

  it('quest seeds per npc are unchanged', () => {
    const seeds = Object.fromEntries(
      allIds.map((id) => [
        id,
        { en: seedsFor(id, 'en'), vi: seedsFor(id, 'vi') },
      ])
    )
    expect(canon(seeds)).toMatchSnapshot()
  })

  it('composed agent prompts are unchanged', () => {
    const prompts = Object.fromEntries(
      allIds.map((id) => [id, npcInstructions(id)])
    )
    expect(canon(prompts)).toMatchSnapshot()
  })
})
