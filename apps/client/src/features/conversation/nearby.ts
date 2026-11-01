import type { NpcId } from '@saigon/shared'
import { npcPosition } from '@/shared/api/city'
import { distance, PEOPLE, type Point } from '@/shared/world/places'

export function nearbyNpcs(npc: NpcId, position: Point) {
  return (Object.keys(PEOPLE) as NpcId[])
    .filter((id) => id !== npc && distance(npcPosition(id), position) < 12)
    .sort(
      (a, b) =>
        distance(npcPosition(a), position) - distance(npcPosition(b), position)
    )
    .slice(0, 8)
}
