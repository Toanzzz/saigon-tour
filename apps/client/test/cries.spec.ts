import { describe, expect, it } from 'vitest'
import {
  CRY_ANCHORS,
  CRY_GAP_MIN_MS,
  CRY_RADIUS,
  CRY_VISIBLE_MS,
  type CryAnchor,
  type CryState,
  inRange,
  MAX_VISIBLE,
  nearNpcBubble,
  newCryState,
  stepCries,
  type Vec2,
} from '@/features/city/cry-scheduler'

const anchors: CryAnchor[] = [
  { id: 'a', at: [0, 0], cries: ['cry_coffee'] },
  { id: 'b', at: [8, 0], cries: ['cry_banhmi'] },
  { id: 'c', at: [12, 0], cries: ['cry_che'] },
]
const freshStates = () =>
  Object.fromEntries(anchors.map((a) => [a.id, newCryState()])) as Record<
    string,
    CryState
  >

const atPlayer: Vec2 = [0, 0]
const eligible = () => anchors.map((a) => [a.id, newCryState()])

describe('the cry scheduler respects range, cap and NPC back-off', () => {
  it('only shouts within the 18-unit radius', () => {
    expect(inRange(anchors[0], [0, CRY_RADIUS - 1])).toBe(true)
    expect(inRange(anchors[0], [0, CRY_RADIUS + 1])).toBe(false)
  })

  it('shows at most two bubbles at once', () => {
    const states = freshStates()
    const { bubbles } = stepCries(anchors, states, atPlayer, [], 1000, () => 0)
    expect(bubbles.length).toBe(MAX_VISIBLE)
  })

  it('holds the cap when a later anchor is already showing', () => {
    // Regression: the cap must count every holder, not just anchors seen so
    // far. Here the LAST anchor ('c') is mid-cry while 'a' and 'b' are idle
    // and eligible; only one new bubble may join it.
    const states = freshStates()
    states.c = { showing: 'cry_che', hideAt: 5000, nextAt: 0 }
    const { bubbles } = stepCries(anchors, states, atPlayer, [], 1000, () => 0)
    expect(bubbles.length).toBe(MAX_VISIBLE)
    expect(bubbles.some((b) => b.id === 'c')).toBe(true)
  })

  it('backs off an anchor while an NPC bubble is within 5 units', () => {
    expect(nearNpcBubble(anchors[0], [[2, 0]])).toBe(true)
    expect(nearNpcBubble(anchors[0], [[10, 0]])).toBe(false)
    const states = freshStates()
    // Mute anchor a with an NPC bubble on top of it; b and c then take the
    // two slots.
    const { bubbles } = stepCries(
      anchors,
      states,
      atPlayer,
      [[0, 0]],
      1000,
      () => 0
    )
    expect(bubbles.map((b) => b.id)).not.toContain('a')
    expect(bubbles.length).toBe(MAX_VISIBLE)
  })

  it('hides a bubble after 3.5 s and schedules the next ≥6 s out', () => {
    let states = freshStates()
    let out = stepCries(anchors, states, atPlayer, [], 0, () => 0)
    states = out.states
    expect(out.bubbles.length).toBe(MAX_VISIBLE)
    // Just before expiry the bubble is still up.
    out = stepCries(anchors, states, atPlayer, [], CRY_VISIBLE_MS - 1, () => 0)
    states = out.states
    expect(out.bubbles.some((b) => b.id === 'a')).toBe(true)
    // After expiry it clears and cannot immediately re-show.
    out = stepCries(anchors, states, atPlayer, [], CRY_VISIBLE_MS + 1, () => 0)
    states = out.states
    expect(states.a.showing).toBeNull()
    expect(states.a.nextAt).toBeGreaterThanOrEqual(
      CRY_VISIBLE_MS + 1 + CRY_GAP_MIN_MS
    )
  })

  it('never shows a bubble for an out-of-range anchor', () => {
    const states = freshStates()
    const { bubbles } = stepCries(
      anchors,
      states,
      [100, 100],
      [],
      1000,
      () => 0
    )
    expect(bubbles.length).toBe(0)
  })
})

describe('the authored anchors are well formed', () => {
  it('cover the four cry zones with 2–3 cries each', () => {
    expect(CRY_ANCHORS.length).toBeGreaterThanOrEqual(4)
    for (const a of CRY_ANCHORS) {
      expect(a.cries.length).toBeGreaterThanOrEqual(2)
      expect(a.cries.length).toBeLessThanOrEqual(3)
      for (const c of a.cries) expect(c.startsWith('cry_')).toBe(true)
    }
  })
})

void eligible
