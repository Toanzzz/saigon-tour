import {
  type ItemId,
  milestoneSeeds,
  NPC_REGISTRY,
  type NpcId,
  type QuestSpec,
  seedsFor,
  validateSpec,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const ids = Object.keys(NPC_REGISTRY) as NpcId[]

/** Items a seed's steps require the player to already hold (BRING). */
function requiredItems(spec: QuestSpec): Partial<Record<ItemId, number>> {
  const inv: Partial<Record<ItemId, number>> = {}
  for (const step of spec.steps)
    if (step.type === 'BRING') inv[step.itemId] = (inv[step.itemId] ?? 0) + 1
  return inv
}

function checkSpec(spec: QuestSpec) {
  const result = validateSpec(spec, {
    quests: [],
    inventory: requiredItems(spec),
  })
  expect(result.ok, `${spec.giverNpcId}: ${JSON.stringify(spec.steps)}`).toBe(
    true
  )
}

describe('every seed is valid in both locales', () => {
  it.each(ids)('%s seeds pass validateSpec and carry both locales', (id) => {
    const en = seedsFor(id, 'en')
    const vi = seedsFor(id, 'vi')
    const mEn = milestoneSeeds(id, 'en')
    const mVi = milestoneSeeds(id, 'vi')
    expect(en.length).toBe(vi.length)
    expect(mEn.length).toBe(mVi.length)
    for (const spec of [...en, ...mEn]) checkSpec(spec)
    // Both locales present and within authored length limits.
    for (const [a, b] of [
      [en, vi],
      [mEn, mVi],
    ] as const)
      a.forEach((spec, i) => {
        const other = b[i]
        expect(other).toBeDefined()
        expect(spec.title.length).toBeLessThanOrEqual(80)
        expect(spec.description.length).toBeLessThanOrEqual(360)
        if (spec.payoff) expect(spec.payoff.length).toBeLessThanOrEqual(160)
        if (spec.twist) expect(spec.twist.line.length).toBeLessThanOrEqual(160)
        if (spec.riddle)
          expect(spec.riddle.text.length).toBeLessThanOrEqual(160)
        if (other?.payoff) expect(other.payoff.length).toBeLessThanOrEqual(160)
      })
  })
})
