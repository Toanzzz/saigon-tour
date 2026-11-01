import {
  GIVER_UNLOCKS,
  NPC_NAMES,
  NPC_POSITIONS,
  NPC_REGISTRY,
  NPCS,
  npcText,
  QUEST_DOMAINS,
  residentPrompt,
  seedsFor,
  UNLOCKS,
} from '@saigon/shared'

const hoa = NPC_REGISTRY.hoa

import { describe, expect, it } from 'vitest'

/** The packaged NPC must reconstruct exactly what the shared tables hold today. */
describe('npc package round-trip', () => {
  it('hoa matches the shared NPC tables', () => {
    expect(hoa.profile.names).toEqual(NPC_NAMES.hoa)
    expect(hoa.profile.kind).toBe(NPCS.hoa.kind)
    expect(hoa.profile.friendliness).toBe(NPCS.hoa.friendliness)
    expect(hoa.profile.personality).toBe(NPCS.hoa.personality)
    expect(hoa.profile.speakingStyle).toBe(NPCS.hoa.speakingStyle)
    expect(hoa.profile.home).toBe(NPCS.hoa.location)
    expect(hoa.profile.text.en).toEqual(npcTextRole('en'))
    expect(hoa.profile.text.vi).toEqual(npcTextRole('vi'))
  })

  function npcTextRole(locale: 'en' | 'vi') {
    const t = npcText('hoa', locale)
    return { role: t.role, knowledge: t.knowledge }
  }

  it('hoa story matches shared quests and domain', () => {
    expect(hoa.story.domain).toEqual(QUEST_DOMAINS.hoa)
    const en = seedsFor('hoa', 'en')[0]
    const vi = seedsFor('hoa', 'vi')[0]
    expect(hoa.story.seeds[0].steps).toEqual(en.steps)
    expect(hoa.story.seeds[0].scope).toBe(en.scope)
    expect(hoa.story.seeds[0].text.en).toEqual({
      title: en.title,
      description: en.description,
    })
    expect(hoa.story.seeds[0].text.vi).toEqual({
      title: vi.title,
      description: vi.description,
    })
  })

  it('hoa unlocks match the shared catalog', () => {
    const ids = hoa.unlocks.map((u) => u.id)
    expect(ids).toEqual(GIVER_UNLOCKS.hoa)
    for (const u of hoa.unlocks) {
      const shared = UNLOCKS[u.id]
      expect(shared.kind).toBe(u.kind)
      expect(shared.slot).toBe(u.slot)
      expect(shared.tier).toBe(u.tier)
      expect(shared.giver).toBe('hoa')
      expect(shared.model).toBe(u.model)
    }
  })

  it('hoa placement matches shared positions', () => {
    expect(hoa.place.anchor).toEqual([...NPC_POSITIONS.hoa])
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
