import type { Quest } from '@saigon/shared'
import { npcPosition } from '@/shared/api/city'
import { nextStep } from '@/shared/state/quests'
import { PLACES, type Point } from '@/shared/world/places'

export function questPin(quest: Quest): Point {
  const step = nextStep(quest)
  if (!step) return npcPosition(quest.giverNpcId)
  if (step.type === 'GO_TO') return PLACES[step.locationId].at
  if (step.type === 'BUY') return PLACES.market.at
  return npcPosition(step.npcId)
}
