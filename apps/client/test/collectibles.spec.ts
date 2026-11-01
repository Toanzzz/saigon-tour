import { COIN_PICKUPS } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { SOLIDS } from '@/shared/world/solids'

/** A coin collides with the player capsule (radius 0.35); keep a little slack. */
const PLAYER_RADIUS = 0.35
const CLEARANCE = 0.4
// Walkable District 1 bounds used by the city-layout reachability lint.
const BOUNDS = { minX: -52, maxX: 124, minZ: -116, maxZ: 44 }

describe('world coin pickups', () => {
  it('places coins on open ground, clear of every solid', () => {
    const blockers = SOLIDS.filter((s) => s.kind !== 'wall')
    const buried: string[] = []
    for (const coin of COIN_PICKUPS) {
      const [x, z] = coin.at
      const inside = blockers.find(
        (s) =>
          Math.abs(x - s.x) < s.hx + PLAYER_RADIUS + CLEARANCE &&
          Math.abs(z - s.z) < s.hz + PLAYER_RADIUS + CLEARANCE
      )
      if (inside) buried.push(`${coin.id} inside ${inside.id}`)
    }
    expect(buried).toEqual([])
  })

  it('keeps every coin inside the walkable bounds', () => {
    const out: string[] = []
    for (const coin of COIN_PICKUPS) {
      const [x, z] = coin.at
      if (
        x < BOUNDS.minX ||
        x > BOUNDS.maxX ||
        z < BOUNDS.minZ ||
        z > BOUNDS.maxZ
      )
        out.push(coin.id)
    }
    expect(out).toEqual([])
  })

  it('uses unique ids and a positive amount', () => {
    const ids = COIN_PICKUPS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(COIN_PICKUPS.every((c) => c.amount > 0)).toBe(true)
  })
})
