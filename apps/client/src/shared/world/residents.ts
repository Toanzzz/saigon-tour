import { NPC_LOOKS, type NpcId } from '@saigon/shared'

type Resident = {
  at: [number, number]
  id: NpcId
  model: 'male-a' | 'male-b' | 'female-a' | 'female-b'
  animation: string
  yaw?: number
  walk?: [number, number]
  phase?: number
}

/** Resident world placements and poses, derived from each resident package. */
export const RESIDENT_VISUALS: Resident[] = Object.values(NPC_LOOKS)
  .filter((look) => look.kind === 'resident')
  .map((look) => ({
    id: look.id,
    at: look.at,
    model: (look.body === 'own' ? 'female-b' : look.body) as Resident['model'],
    animation: look.animation,
    ...(look.yaw !== undefined ? { yaw: look.yaw } : {}),
    ...(look.walk ? { walk: look.walk } : {}),
    ...(look.phase !== undefined ? { phase: look.phase } : {}),
  }))
