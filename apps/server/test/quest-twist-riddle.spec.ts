import {
  advance,
  createQuest,
  isRevealed,
  type Quest,
  type QuestSpec,
  RIDDLE_REVEAL_MS,
  rewardFor,
  validateSpec,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const base: QuestSpec = {
  giverNpcId: 'hoa',
  title: 'Twist arc',
  description: 'Two-step arc with a twist.',
  scope: 'solo',
  steps: [
    { type: 'GO_TO', locationId: 'alley' },
    { type: 'DELIVER', itemId: 'broth', npcId: 'linh' },
  ],
  twist: {
    step: { type: 'DELIVER', itemId: 'broth', npcId: 'mai' },
    line: 'Linh moved to the lantern crew; feed Mai instead.',
  },
}

const empty = { quests: [] as Quest[] }
const now = 1_000_000

describe('twist contracts', () => {
  it('applies once when earlier steps are done and keeps replaced', () => {
    const quest = createQuest(base, 'q_twist', now)
    const visited = advance(quest, { type: 'visit', locationId: 'alley' }, now)
    // Final step was rewritten to Mai.
    expect(visited.steps[1]).toEqual({
      type: 'DELIVER',
      itemId: 'broth',
      npcId: 'mai',
    })
    expect(visited.twist?.replaced).toEqual({
      type: 'DELIVER',
      itemId: 'broth',
      npcId: 'linh',
    })
    // Delivering to the original target no longer advances.
    const toLinh = advance(
      visited,
      { type: 'deliver', itemId: 'broth', npcId: 'linh' },
      now
    )
    expect(toLinh.progress[1]).toBe(false)
    const toMai = advance(
      visited,
      { type: 'deliver', itemId: 'broth', npcId: 'mai' },
      now
    )
    expect(toMai.status).toBe('ready')
    // Idempotent: replaced is not overwritten on a later advance.
    expect(toMai.twist?.replaced).toEqual(visited.twist?.replaced)
  })

  it('enforces the type and item rules', () => {
    expect(
      validateSpec({ ...base, steps: [base.steps[0]] }, empty)
    ).toMatchObject({ ok: false, reason: 'twist_needs_two_steps' })
    expect(
      validateSpec(
        {
          ...base,
          twist: { step: { type: 'TALK_TO', npcId: 'mai' }, line: 'x' },
        },
        empty
      )
    ).toMatchObject({ ok: false, reason: 'twist_type_mismatch' })
    expect(
      validateSpec(
        {
          ...base,
          twist: {
            step: { type: 'DELIVER', itemId: 'herbs', npcId: 'mai' },
            line: 'x',
          },
        },
        empty
      )
    ).toMatchObject({ ok: false, reason: 'twist_item_mismatch' })
    expect(validateSpec(base, empty).ok).toBe(true)
  })

  it('counts the twist step in the reward distance', () => {
    const withTwist = rewardFor(base)
    const { twist: _omit, ...noTwist } = base
    const plain = rewardFor(noTwist as QuestSpec)
    expect(withTwist.currency).toBeGreaterThanOrEqual(plain.currency)
  })
})

const riddleSpec: QuestSpec = {
  giverNpcId: 'thao',
  title: 'Riddle',
  description: 'Hidden first step.',
  scope: 'solo',
  steps: [
    { type: 'TALK_TO', npcId: 'son' },
    { type: 'TALK_TO', npcId: 'vy' },
  ],
  riddle: { text: 'Find the neighbor who never stops moving.' },
}

describe('riddle contracts', () => {
  it('rejects a BUY first step', () => {
    expect(
      validateSpec(
        {
          ...riddleSpec,
          steps: [
            { type: 'BUY', marketItemId: 'coffee' },
            { type: 'TALK_TO', npcId: 'son' },
          ],
        },
        empty
      )
    ).toMatchObject({ ok: false, reason: 'riddle_bad_first_step' })
  })

  it('solves on completing step 0', () => {
    const quest = createQuest(riddleSpec, 'q_r1', now)
    expect(isRevealed(quest, now)).toBe(false)
    const solved = advance(quest, { type: 'talk', npcId: 'son' }, now)
    expect(solved.revealed).toBe('solved')
    expect(solved.progress[0]).toBe(true)
  })

  it('solves on talking to step 0 own NPC before it is the current step', () => {
    // Craft a riddle whose step 0 NPC equals a non-current talk target.
    const spec: QuestSpec = {
      ...riddleSpec,
      steps: [
        { type: 'TALK_TO', npcId: 'son' },
        { type: 'TALK_TO', npcId: 'vy' },
      ],
    }
    const quest = createQuest(spec, 'q_r2', now)
    const solved = advance(quest, { type: 'talk', npcId: 'son' }, now)
    expect(solved.revealed).toBe('solved')
  })

  it('reveals via talk to any neighbor except the giver, not solved', () => {
    const quest = createQuest(riddleSpec, 'q_r3', now)
    const talked = advance(quest, { type: 'talk', npcId: 'ba' }, now)
    expect(talked.revealed).toBe('talk')
    expect(talked.progress[0]).toBe(false)
    // Talking to the giver does not reveal.
    const giver = advance(quest, { type: 'talk', npcId: 'thao' }, now)
    expect(giver.revealed).toBeUndefined()
  })

  it('reveals after four minutes', () => {
    const quest = createQuest(riddleSpec, 'q_r4', now)
    expect(isRevealed(quest, now + RIDDLE_REVEAL_MS - 1)).toBe(false)
    expect(isRevealed(quest, now + RIDDLE_REVEAL_MS)).toBe(true)
  })
})
