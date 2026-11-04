import type { NpcId } from '@saigon/shared'
import { talk } from '@/app/actions'
import { npcPosition } from '@/shared/api/city'
import { m } from '@/shared/i18n'
import { motion } from '@/shared/runtime/motion'
import { game, notify, update } from '@/shared/state/game'
import {
  navigation,
  navigationView,
  resetNavigation,
} from '@/shared/state/navigation'
import { npcPoses } from '@/shared/world/npc-pose'
import { distance, type Point } from '@/shared/world/places'
import { isXRPresenting } from '@/shared/xr/store'
import { findRoute } from './pathfinding'

export {
  navigation,
  navigationView,
  resetNavigation,
} from '@/shared/state/navigation'
export const cancelNavigation = resetNavigation
let lastPlan = 0
let lastProgress: Point | null = null
let stalled = 0

export function canNavigate() {
  const state = game.state
  return (
    state.screen === 'playing' &&
    !state.dialogue &&
    state.panel === 'none' &&
    !state.ride &&
    !isXRPresenting()
  )
}
function npcAt(npc: NpcId) {
  return npcPoses.get(npc) ?? npcPosition(npc)
}
function fail() {
  resetNavigation()
  notify(m.navigation_unreachable())
}
function navigate(point: Point, npc?: NpcId) {
  if (!canNavigate()) return false
  const from: Point = [motion.position.x, 0.9, motion.position.z]
  const path = findRoute(from, point, npc ? 3 : 0.3)
  if (!path) {
    fail()
    return false
  }
  resetNavigation()
  lastProgress = null
  stalled = 0
  navigation.path = path
  navigationView.setState(() => ({ point, npc }))
  lastPlan = performance.now()
  return true
}
export function navigateToPoint(point: Point) {
  return navigate(point)
}
export function navigateToNpc(npc: NpcId) {
  return navigate(npcAt(npc), npc)
}

/** Called before movement: routes use world axes, independent of camera yaw. */
export function stepNavigation(delta: number) {
  let target = navigationView.state
  if (!target) return null
  if (!canNavigate() || motion.teleport) {
    resetNavigation()
    return null
  }
  const from: Point = [motion.position.x, 0.9, motion.position.z]
  if (target.npc) {
    const at = npcAt(target.npc)
    if (distance(from, at) <= 3.5) {
      const npc = target.npc
      resetNavigation()
      update({ position: from })
      void talk(npc)
      return null
    }
    if (
      performance.now() - lastPlan > 500 &&
      distance(at, target.point) > 0.75
    ) {
      if (!navigate(at, target.npc)) return null
      target = navigationView.state
    }
  }
  if (!target) return null
  if (!lastProgress || distance(from, lastProgress) > 0.1) {
    lastProgress = from
    stalled = 0
  } else stalled += Math.min(delta, 0.1)
  if (stalled > 2) {
    fail()
    return null
  }
  while (navigation.path[0] && distance(from, navigation.path[0]) < 0.3)
    navigation.path.shift()
  const next = navigation.path[0]
  if (!next) {
    resetNavigation()
    return null
  }
  return next
}
