import type { RequestContext } from '@mastra/core/request-context'
import type { NpcId } from '@saigon/shared'
import type { GameService, ToolOutcome } from '@/domain/game'
import type { NpcMemoryService } from '../memory/npc-memory'

export type { ToolOutcome } from '@/domain/game'
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
