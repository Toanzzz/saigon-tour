import { persona as alex } from '@saigon/npc-alex/persona'
import { persona as ba } from '@saigon/npc-ba/persona'
import { persona as hoa } from '@saigon/npc-hoa/persona'
import { residentPrompt } from '@saigon/npc-kit/persona'
import { persona as linh } from '@saigon/npc-linh/persona'
import { persona as mai } from '@saigon/npc-mai/persona'
import { persona as son } from '@saigon/npc-son/persona'
import { persona as tam } from '@saigon/npc-tam/persona'
import { persona as thao } from '@saigon/npc-thao/persona'
import { persona as vy } from '@saigon/npc-vy/persona'
import type { NpcId } from '../entities'
import { NPCS } from './derive'

/**
 * AI prompt bodies, keyed by NPC id. Server-only: import from
 * `@saigon/shared/personas`, never from the client. Neighbors ship a bespoke
 * body; residents compose the shared resident template. SHARED_RULES is still
 * appended by the server.
 */
const NEIGHBOR_PROMPTS: Partial<Record<NpcId, string>> = {
  hoa,
  tam,
  linh,
  ba,
  mai,
  alex,
  vy,
  son,
  thao,
}

function promptFor(id: NpcId): string {
  const neighbor = NEIGHBOR_PROMPTS[id]
  if (neighbor) return neighbor
  const npc = NPCS[id]
  return residentPrompt({
    name: npc.name,
    role: npc.role,
    home: npc.location,
    personality: npc.personality,
    speakingStyle: npc.speakingStyle,
    knowledge: npc.knowledge,
  })
}

/** Mutable so tests can tweak a single prompt (e.g. harness greetings). */
export const NPC_PROMPTS: Record<NpcId, string> = Object.fromEntries(
  (Object.keys(NPCS) as NpcId[]).map((id) => [id, promptFor(id)])
) as Record<NpcId, string>

export { residentPrompt } from '@saigon/npc-kit/persona'
