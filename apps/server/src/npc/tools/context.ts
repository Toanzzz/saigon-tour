import type { RequestContext } from '@mastra/core/request-context'
import type { NpcId, Quest, Reward } from '@saigon/shared'
import type { GameService } from '../../game/state'
import type { NpcMemoryService } from '../memory/npc-memory'

/** What tools may touch, and a record of what they did during one request. */
export interface ToolOutcome {
  calls: string[]
  offered?: Quest
  completed?: { quest: Quest; reward: Reward }
  incomplete?: Quest
}
export interface NpcRequestValues {
  playerId: string
  npcId: NpcId
  outcome: ToolOutcome
}
export interface NpcServices {
  game: GameService
  memory: NpcMemoryService
}
export type NpcRequestContext = RequestContext<NpcRequestValues>

export function requestValues(context: { requestContext?: unknown }) {
  const rc = context.requestContext as NpcRequestContext | undefined
  const playerId = rc?.get('playerId')
  const npcId = rc?.get('npcId')
  const outcome = rc?.get('outcome')
  if (!playerId || !npcId || !outcome)
    throw new Error('missing_request_context')
  return { playerId, npcId, outcome }
}
