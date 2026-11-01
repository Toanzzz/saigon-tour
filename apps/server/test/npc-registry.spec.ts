import {
  GIVER_UNLOCKS,
  NEIGHBOR_IDS,
  type NeighborId,
  NPC_NAMES,
  NPC_POSITIONS,
  NPC_REGISTRY,
  NPCS,
  type NpcId,
  npcText,
  QUEST_DOMAINS,
  residentPrompt,
  seedsFor,
  UNLOCKS,
} from '@saigon/shared'
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
    const en = seedsFor(id, 'en')
    const vi = seedsFor(id, 'vi')
    expect(def.story.seeds).toHaveLength(en.length)
    def.story.seeds.forEach((seed, i) => {
      expect(seed.steps).toEqual(en[i].steps)
      expect(seed.scope).toBe(en[i].scope)
      expect(seed.text.en).toEqual({
        title: en[i].title,
        description: en[i].description,
      })
      expect(seed.text.vi).toEqual({
        title: vi[i].title,
        description: vi[i].description,
      })
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
