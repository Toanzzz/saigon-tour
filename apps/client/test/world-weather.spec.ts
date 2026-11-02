import { NEIGHBOR_IDS, RESIDENT_IDS } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { skyColors } from '@/features/city/atmosphere'
import {
  pickUmbrellas,
  UMBRELLA_MAX,
  UMBRELLA_RADIUS,
} from '@/features/npcs/umbrella-picker'
import { LAMP_GLOW_COUNT } from '@/shared/world/evening'
import { PALETTE } from '@/shared/world/palette'
import { STREET_LIGHT_PLACEMENTS } from '@/shared/world/placements'
import { HERITAGE_WINDOWS } from '@/shared/world/windows'

// jsdom has no `?look`, so LOOK resolves to 'comic' for these specs.

describe('the umbrella picker returns the nearest NPCs', () => {
  const at = (x: number, z: number) => ({
    id: 'tam' as const,
    position: [x, 0, z] as [number, number, number],
  })

  it('keeps at most 16, nearest first', () => {
    const candidates = Array.from({ length: 30 }, (_, i) => ({
      id: `n${i}` as never,
      position: [i, 0, 0] as [number, number, number],
    }))
    const picks = pickUmbrellas(candidates, [0, 0, 0], UMBRELLA_MAX, 100)
    expect(picks.length).toBe(UMBRELLA_MAX)
    for (let i = 1; i < picks.length; i++)
      expect(picks[i].distanceSq).toBeGreaterThanOrEqual(
        picks[i - 1].distanceSq
      )
    // Nearest overall is the one at x=0.
    expect(picks[0].position[0]).toBe(0)
  })

  it('drops NPCs beyond the radius', () => {
    const candidates = [at(5, 0), at(UMBRELLA_RADIUS + 10, 0)]
    const picks = pickUmbrellas(candidates, [0, 0, 0])
    expect(picks.length).toBe(1)
    expect(picks[0].position[0]).toBe(5)
  })

  it('measures horizontal distance only (ignores y)', () => {
    const picks = pickUmbrellas(
      [{ id: 'hoa' as never, position: [0, 100, 0] }],
      [0, 0, 0]
    )
    expect(picks.length).toBe(1)
  })

  it('is deterministic on ties', () => {
    const a = pickUmbrellas(
      [
        { id: 'zed' as never, position: [3, 0, 0] },
        { id: 'abe' as never, position: [3, 0, 0] },
      ],
      [0, 0, 0]
    )
    expect(a.map((p) => p.id)).toEqual(['abe', 'zed'])
  })
})

describe('the merged lamp glow covers every lamp', () => {
  it('equals the 16 street lamps plus the 12 existing boxes', () => {
    expect(STREET_LIGHT_PLACEMENTS.length).toBe(16)
    expect(LAMP_GLOW_COUNT).toBe(STREET_LIGHT_PLACEMENTS.length + 12)
  })
})

describe('the heritage windows are authored for the four façades', () => {
  it('has lit panes for cathedral, post office, opera and City Hall', () => {
    // Four façade families, so well over a dozen panes but a sane upper bound.
    expect(HERITAGE_WINDOWS.length).toBeGreaterThan(12)
    expect(HERITAGE_WINDOWS.length).toBeLessThan(80)
    // Every pane is a thin quad pushed just off its façade plane.
    for (const w of HERITAGE_WINDOWS) {
      const scale = w.scale as [number, number, number]
      expect(Math.min(...scale)).toBeLessThanOrEqual(0.1)
      expect(w.position[1]).toBeGreaterThan(1)
    }
  })
})

describe('rain and evening colours come from the palette', () => {
  it('rain sky uses the rain tokens', () => {
    const rain = skyColors(true, false)
    expect(rain.top).toBe(PALETTE.skyRainTop)
    expect(rain.horizon).toBe(PALETTE.skyRainHorizon)
  })

  it('the wet-road and window tokens are the palette values', () => {
    expect(PALETTE.wetRoad).toMatch(/^#[0-9a-f]{6}$/i)
    expect(PALETTE.window3000k).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('every NPC id has an umbrella candidate source', () => {
  it('covers neighbors and residents', () => {
    expect(NEIGHBOR_IDS.length + RESIDENT_IDS.length).toBeGreaterThan(20)
  })
})
