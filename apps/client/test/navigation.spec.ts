import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  navigateToNpc,
  navigateToPoint,
  stepNavigation,
} from '@/features/player/navigation'
import { findRoute, segmentClear } from '@/features/player/pathfinding'
import { motion } from '@/shared/runtime/motion'
import { game, initialState, update } from '@/shared/state/game'
import { navigationView, resetNavigation } from '@/shared/state/navigation'
import { npcPoses } from '@/shared/world/npc-pose'
import { distance, type Point, SPAWN } from '@/shared/world/places'

vi.mock('@/app/actions', () => ({ talk: vi.fn() }))

import { talk } from '@/app/actions'

beforeEach(() => {
  game.setState(() => ({ ...initialState(), screen: 'playing' }))
  motion.position.set(...SPAWN)
  motion.teleport = null
  npcPoses.clear()
  resetNavigation()
  vi.mocked(talk).mockClear()
})
describe('world navigation', () => {
  it('routes around the market with collision-safe segments', () => {
    const route = findRoute([-38, 0.9, 5], [-7, 0.9, -24])
    expect(route).not.toBeNull()
    if (!route) return
    expect(route.length).toBeGreaterThan(2)
    expect(distance(route.at(-1) as Point, [-7, 0.9, -24])).toBeLessThan(0.3)
    for (let i = 1; i < route.length; i++)
      expect(segmentClear(route[i - 1], route[i])).toBe(true)
  })
  it('rejects buildings, out-of-bounds and invalid destinations', () => {
    expect(findRoute(SPAWN, [-23, 0.9, -12])).toBeNull()
    expect(findRoute(SPAWN, [900, 0.9, 0])).toBeNull()
    expect(findRoute(SPAWN, [NaN, 0.9, 0])).toBeNull()
  })
  it('replaces targets and refuses overlay navigation', () => {
    expect(navigateToPoint([-20, 0.9, 10])).toBe(true)
    expect(navigateToPoint([-16, 0.9, 10])).toBe(true)
    expect(navigationView.state?.point[0]).toBe(-16)
    update({ panel: 'map' })
    stepNavigation(0.1)
    expect(navigationView.state).toBeNull()
    expect(navigateToPoint(SPAWN)).toBe(false)
  })
  it('opens the selected nearby NPC exactly once', () => {
    npcPoses.set('hoa', [-23, 0, 8])
    navigateToNpc('hoa')
    stepNavigation(0.1)
    stepNavigation(0.1)
    expect(talk).toHaveBeenCalledExactlyOnceWith('hoa')
    expect(navigationView.state).toBeNull()
  })
  it('does not open the conversation until in range', () => {
    npcPoses.set('hoa', [-12, 0, 10])
    navigateToNpc('hoa')
    expect(stepNavigation(0.1)).not.toBeNull()
    expect(talk).not.toHaveBeenCalled()
    motion.position.set(-14, 0.9, 10)
    stepNavigation(0.1)
    expect(talk).toHaveBeenCalledExactlyOnceWith('hoa')
  })
  it('replans a moving NPC using its rendered position', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
    npcPoses.set('hoa', [-12, 0, 10])
    navigateToNpc('hoa')
    npcPoses.set('hoa', [-10, 0, 8])
    now.mockReturnValue(1600)
    stepNavigation(0.1)
    expect(navigationView.state?.point).toEqual([-10, 0, 8])
    expect(talk).not.toHaveBeenCalled()
    now.mockRestore()
  })
  it('cancels navigation on teleport and reset', () => {
    navigateToPoint([-16, 0.9, 10])
    motion.teleport = [10, 10]
    stepNavigation(0.1)
    expect(navigationView.state).toBeNull()
    motion.teleport = null
    navigateToPoint([-16, 0.9, 10])
    resetNavigation()
    expect(stepNavigation(0.1)).toBeNull()
  })
  it('stops a route when the player is stuck', () => {
    navigateToPoint([-16, 0.9, 10])
    for (let i = 0; i < 25; i++) stepNavigation(0.1)
    expect(navigationView.state).toBeNull()
  })
})
