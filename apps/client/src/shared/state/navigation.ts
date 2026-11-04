import type { NpcId } from '@saigon/shared'
import { Store } from '@tanstack/store'
import type { Point } from '@/shared/world/places'

export type NavigationTarget = { point: Point; npc?: NpcId }
export const navigationView = new Store<NavigationTarget | null>(null)
/** Per-frame route progress is deliberately non-reactive. */
export const navigation = { path: [] as Point[] }
export function resetNavigation() {
  navigation.path = []
  if (navigationView.state) navigationView.setState(() => null)
}
