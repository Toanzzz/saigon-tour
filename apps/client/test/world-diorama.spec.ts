import { describe, expect, it } from 'vitest'
import { skyColors } from '@/features/city/atmosphere'
import {
  lensFor,
  MOBILE_TITLE_FOV,
  PLAY_FOV,
  TITLE_FOV,
} from '@/features/player/camera'
import { BOUNDS } from '@/shared/world/district'
import { PALETTE } from '@/shared/world/palette'
import { ringPlacements } from '@/shared/world/paper-clouds'
import { SKYLINE_CARDS } from '@/shared/world/skyline-cards'

// jsdom has no `?look`, so LOOK resolves to 'comic' for these specs.

const outsideBounds = (x: number, z: number) =>
  x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ

describe('sky colours come from the palette per mode', () => {
  it('day uses the day tokens and fog equals the horizon', () => {
    const day = skyColors(false, false)
    expect(day.top).toBe(PALETTE.skyDayTop)
    expect(day.horizon).toBe(PALETTE.skyDayHorizon)
  })

  it('evening uses the sunset tokens', () => {
    const eve = skyColors(false, true)
    expect(eve.top).toBe(PALETTE.skyEveTop)
    expect(eve.horizon).toBe(PALETTE.skyEveHorizon)
  })

  it('rain uses the rain tokens and wins over evening', () => {
    const rain = skyColors(true, true)
    expect(rain.top).toBe(PALETTE.skyRainTop)
    expect(rain.horizon).toBe(PALETTE.skyRainHorizon)
  })
})

describe('the cloud ring sits outside the world bounds', () => {
  for (const count of [6, 10]) {
    it(`all ${count} clouds are outside BOUNDS`, () => {
      const ring = ringPlacements(count)
      expect(ring).toHaveLength(count)
      for (const cloud of ring) {
        const [x, y, z] = cloud.position
        expect(outsideBounds(x, z)).toBe(true)
        expect(y).toBeGreaterThanOrEqual(25)
        expect(y).toBeLessThanOrEqual(45)
      }
    })
  }
})

describe('the skyline cards sit outside the world bounds', () => {
  it('every card centre is beyond a wall', () => {
    expect(SKYLINE_CARDS.length).toBeGreaterThanOrEqual(3)
    expect(SKYLINE_CARDS.length).toBeLessThanOrEqual(4)
    for (const card of SKYLINE_CARDS) {
      const [x, , z] = card.position
      expect(outsideBounds(x, z)).toBe(true)
    }
  })
})

describe('the title shot uses the long lens', () => {
  it('reads fov ~22 on the title and 49 everywhere else', () => {
    expect(TITLE_FOV).toBe(22)
    expect(PLAY_FOV).toBe(49)
    expect(lensFor('title')).toBe(22)
    expect(lensFor('title', true)).toBe(MOBILE_TITLE_FOV)
    expect(lensFor('playing', true)).toBe(49)
    expect(lensFor('playing')).toBe(49)
    expect(lensFor('paused')).toBe(49)
  })
})
