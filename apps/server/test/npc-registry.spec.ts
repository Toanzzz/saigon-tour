import {
  GIVER_UNLOCKS,
  milestoneSeeds,
  NEIGHBOR_IDS,
  type NeighborId,
  NPC_NAMES,
  NPC_POSITIONS,
  NPC_REGISTRY,
  NPCS,
  type NpcId,
  npcText,
  QUEST_DOMAINS,
  RESIDENT_ANCHORS,
  RESIDENT_IDS,
  seedsFor,
  UNLOCKS,
} from '@saigon/shared'
import { residentPrompt } from '@saigon/shared/personas'
import { describe, expect, it } from 'vitest'

/** Every packaged NPC must reconstruct exactly what the shared tables hold today. */
describe('npc package round-trip', () => {
  const registered = Object.keys(NPC_REGISTRY) as NpcId[]

  it.each(registered)('%s profile matches the shared tables', (id) => {
    const def = NPC_REGISTRY[id as keyof typeof NPC_REGISTRY]
    expect(def.profile.names).toEqual(NPC_NAMES[id])
    expect(def.profile.kind).toBe(NPCS[id].kind)
    expect(def.profile.friendliness).toBe(NPCS[id].friendliness)
    expect(def.profile.personality).toBe(NPCS[id].personality)
    expect(def.profile.speakingStyle).toBe(NPCS[id].speakingStyle)
    expect(def.profile.home).toBe(NPCS[id].location)
    const en = npcText(id, 'en')
    const vi = npcText(id, 'vi')
    expect(def.profile.text.en).toEqual({
      role: en.role,
      knowledge: en.knowledge,
    })
    expect(def.profile.text.vi).toEqual({
      role: vi.role,
      knowledge: vi.knowledge,
    })
  })

  it.each(registered)('%s story matches shared quests and domain', (id) => {
    const def = NPC_REGISTRY[id as keyof typeof NPC_REGISTRY]
    expect(def.story.domain).toEqual(QUEST_DOMAINS[id])
    // seedsFor excludes milestone seeds; milestoneSeeds returns them. Both
    // preserve registry seed order, so compare each group positionally.
    const en = seedsFor(id, 'en')
    const vi = seedsFor(id, 'vi')
    const mEn = milestoneSeeds(id, 'en')
    const mVi = milestoneSeeds(id, 'vi')
    const base = def.story.seeds.filter((seed) => !seed.milestone)
    const milestones = def.story.seeds.filter((seed) => seed.milestone)
    expect(base).toHaveLength(en.length)
    expect(milestones).toHaveLength(mEn.length)
    const match = (
      seed: (typeof def.story.seeds)[number],
      e: (typeof en)[number],
      v: (typeof vi)[number]
    ) => {
      expect(seed.steps).toEqual(e.steps)
      expect(seed.scope).toBe(e.scope)
      expect(seed.text.en).toEqual({
        title: e.title,
        description: e.description,
      })
      expect(seed.text.vi).toEqual({
        title: v.title,
        description: v.description,
      })
    }
    base.forEach((seed, i) => {
      match(seed, en[i], vi[i])
    })
    milestones.forEach((seed, i) => {
      match(seed, mEn[i], mVi[i])
    })
  })

  it.each(registered)('%s unlocks match the shared catalog', (id) => {
    const def = NPC_REGISTRY[id as keyof typeof NPC_REGISTRY]
    const ids = def.unlocks.map((u) => u.id)
    expect(ids).toEqual(GIVER_UNLOCKS[id as NeighborId] ?? [])
    for (const u of def.unlocks) {
      const shared = UNLOCKS[u.id]
      expect(shared.kind).toBe(u.kind)
      expect(shared.slot).toBe(u.slot)
      expect(shared.tier).toBe(u.tier)
      expect(shared.giver).toBe(id)
      expect(shared.model).toBe(u.model)
      expect(shared.scale).toBe(u.scale)
      expect(shared.speed).toBe(u.speed)
      expect(shared.palette).toEqual(u.palette)
    }
  })

  it.each(NEIGHBOR_IDS)('%s placement matches shared positions', (id) => {
    const def = NPC_REGISTRY[id as keyof typeof NPC_REGISTRY]
    expect(def.place.anchor).toEqual([...NPC_POSITIONS[id]])
  })

  it('resident prompt helper reproduces the shared template', () => {
    const body = residentPrompt({
      name: 'Minh',
      role: 'Student',
      home: 'park',
      personality:
        'Observant and independent; cares about the neighborhood and student.',
      speakingStyle: 'Brief, civil conversation with local detail',
      knowledge: [
        'I spend my days around the park.',
        'A small favor helps neighbors get to know one another.',
      ],
    })
    expect(body).toContain('You are Minh, Student, based at park.')
  })
})

describe('resident look and placement round-trip', () => {
  it.each(RESIDENT_IDS)('%s placement matches the shared anchor', (id) => {
    const def = NPC_REGISTRY[id as keyof typeof NPC_REGISTRY]
    const anchor = RESIDENT_ANCHORS[id as keyof typeof RESIDENT_ANCHORS]
    expect(def.place.at).toEqual(anchor.at)
    if ('walk' in anchor) expect(def.place.walk).toEqual(anchor.walk)
  })
})
