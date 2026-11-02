import type { NpcId } from '../entities'
import { NPC_ACTIVITIES } from '../npcs/derive'
import type { CitySnapshot } from './schema'

/** A single resolver keeps world poses and encounter narration in agreement. */
export function npcActivity(
  npcId: NpcId,
  city?: CitySnapshot | null,
  now = Date.now()
) {
  const catalog = NPC_ACTIVITIES[npcId]
  const assignment = city?.npcActivities[npcId]
  const activityId =
    assignment &&
    assignment.startedAt <= now &&
    assignment.endsAt > now &&
    Object.hasOwn(catalog, assignment.activityId)
      ? assignment.activityId
      : 'default'
  return { ...catalog[activityId], id: activityId }
}
