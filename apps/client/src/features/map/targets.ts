import { isRevealed, merchantFor, type Quest } from '@saigon/shared'
import { npcPosition } from '@/shared/api/city'
import { nextStep } from '@/shared/state/quests'
import { clock } from '@/shared/state/ui'
import { PLACES, type Point } from '@/shared/world/places'

/** The map pin for a quest, or null while its riddle hides step 0. */
export function questPin(quest: Quest): Point | null {
  if (quest.riddle && !isRevealed(quest, clock.state.now)) return null
  const step = nextStep(quest)
  if (!step) return npcPosition(quest.giverNpcId)
  if (step.type === 'GO_TO') return PLACES[step.locationId].at
  if (step.type === 'BUY') return npcPosition(merchantFor(step.marketItemId))
  return npcPosition(step.npcId)
}
