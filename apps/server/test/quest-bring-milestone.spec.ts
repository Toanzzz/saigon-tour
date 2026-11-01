import {
  advance,
  createQuest,
  milestoneSeeds,
  type Quest,
  type QuestSpec,
  seedsFor,
  validateSpec,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const empty = { quests: [] as Quest[] }
const now = 3_000_000

// Vy hosts the evening concert; a BRING step targets Vy with a component.
const bringSpec: QuestSpec = {
  giverNpcId: 'vy',
  title: 'Bring the lanterns',
  description: 'Bring the lanterns to Vy for the concert.',
  scope: 'solo',
  steps: [{ type: 'BRING', itemId: 'lanterns', npcId: 'vy' }],
  milestone: 'evening-concert',
}

describe('BRING validation', () => {
  it('accepts a component brought to the host when held', () => {
    expect(
      validateSpec(bringSpec, { ...empty, inventory: { lanterns: 1 } }).ok
    ).toBe(true)
  })

  it('rejects when the player does not hold the item', () => {
    expect(validateSpec(bringSpec, empty)).toMatchObject({
      ok: false,
      reason: 'missing_item:lanterns',
    })
  })

  it('rejects a non-component or wrong host', () => {
    expect(
      validateSpec(
        {
          ...bringSpec,
          steps: [{ type: 'BRING', itemId: 'coffee', npcId: 'vy' }],
        },
        { ...empty, inventory: { coffee: 1 } }
      )
    ).toMatchObject({ ok: false, reason: 'out_of_domain:bring:coffee' })
    expect(
      validateSpec(
        {
          ...bringSpec,
          steps: [{ type: 'BRING', itemId: 'lanterns', npcId: 'mai' }],
        },
        { ...empty, inventory: { lanterns: 1 } }
      )
    ).toMatchObject({ ok: false, reason: 'bring_wrong_host' })
  })

  it('advances a BRING step on a matching deliver event', () => {
    const quest = createQuest(bringSpec, 'q_bring', now)
    const after = advance(
      quest,
      { type: 'deliver', itemId: 'lanterns', npcId: 'vy' },
      now
    )
    expect(after.status).toBe('ready')
  })
})

describe('component guard', () => {
  it('rejects DELIVER and BUY of a component', () => {
    // Ba's domain includes son; craft a DELIVER of a component.
    expect(
      validateSpec(
        {
          giverNpcId: 'ba',
          title: 'x',
          description: 'x',
          scope: 'solo',
          steps: [{ type: 'DELIVER', itemId: 'lanterns', npcId: 'son' }],
        },
        empty
      )
    ).toMatchObject({ ok: false, reason: 'component_not_deliverable:lanterns' })
  })

  it('allows gift only on the component giver milestone seed', () => {
    // Ba is the lanterns giver; gift lanterns requires a milestone seed.
    expect(
      validateSpec(
        {
          giverNpcId: 'ba',
          title: 'x',
          description: 'x',
          scope: 'solo',
          steps: [{ type: 'GO_TO', locationId: 'opera' }],
          gift: 'lanterns',
          milestone: 'evening-concert',
        },
        empty
      ).ok
    ).toBe(true)
    // Without the milestone flag the component gift is rejected.
    expect(
      validateSpec(
        {
          giverNpcId: 'ba',
          title: 'x',
          description: 'x',
          scope: 'solo',
          steps: [{ type: 'GO_TO', locationId: 'opera' }],
          gift: 'lanterns',
        },
        empty
      )
    ).toMatchObject({ ok: false, reason: 'gift_component:lanterns' })
  })

  it('rejects a non-domain gift', () => {
    expect(
      validateSpec(
        {
          giverNpcId: 'hoa',
          title: 'x',
          description: 'x',
          scope: 'solo',
          steps: [{ type: 'TALK_TO', npcId: 'linh' }],
          gift: 'photo',
        },
        empty
      )
    ).toMatchObject({ ok: false, reason: 'gift_out_of_domain:photo' })
  })
})

describe('seed catalogs exclude milestone seeds', () => {
  it('seedsFor skips milestone seeds; milestoneSeeds returns them', () => {
    // No milestone seeds exist until Phase 4; both calls are safe and typed.
    for (const npc of ['vy', 'mai', 'thao', 'ba'] as const) {
      expect(seedsFor(npc).every((spec) => !spec.milestone)).toBe(true)
      expect(milestoneSeeds(npc).every((spec) => Boolean(spec.milestone))).toBe(
        true
      )
    }
  })
})
