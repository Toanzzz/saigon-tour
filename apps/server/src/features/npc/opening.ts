import type { MastraCompositeStore } from '@mastra/core/storage'
import type { InteractRequest, InteractResponse, NpcId } from '@saigon/shared'
import type { QuestService } from '@/domain/quests'
import type { prepareEncounter } from './encounter'
import { fallbackLine } from './fallbacks'
import { recordTurn } from './memory/threads'
import { friendshipChanges } from './turn'

export async function openingResponse(
  game: QuestService,
  storage: MastraCompositeStore,
  npcId: NpcId,
  request: InteractRequest,
  playerId: string,
  encounter: Awaited<ReturnType<typeof prepareEncounter>>
): Promise<InteractResponse> {
  const {
    previous,
    current,
    progressEvents,
    completed,
    completedPayoff,
    twistedLine,
    riddleRevealLine,
  } = encounter
  let reply = completed.length
    ? (completedPayoff ??
      fallbackLine(npcId, current.world, 'completed', request.locale))
    : ''
  if (twistedLine) reply = twistedLine
  else if (riddleRevealLine)
    reply =
      request.locale === 'vi'
        ? `Câu đố đó hả? ${riddleRevealLine}.`
        : `That riddle? ${riddleRevealLine}.`
  const messages = reply
    ? await recordTurn(storage, npcId, playerId, '', reply)
    : []
  return {
    npcId,
    revision: current.revision,
    reply,
    messages,
    cached: false,
    source: 'fallback',
    party: game.party?.snapshot(playerId) ?? null,
    degraded: false,
    friendship: current.friendship,
    friendshipEvents: friendshipChanges(
      previous.friendship,
      current.friendship,
      progressEvents
    ),
    world: current.world,
    quests: current.quests,
    questEvents: progressEvents,
    toolCalls: [],
  }
}
