import { persona as alex } from '@saigon/npc-alex/persona'
import { persona as alley_diner } from '@saigon/npc-alley-diner/persona'
import { persona as ba } from '@saigon/npc-ba/persona'
import { persona as bread_vendor } from '@saigon/npc-bread-vendor/persona'
import { persona as hoa } from '@saigon/npc-hoa/persona'
import { residentPrompt } from '@saigon/npc-kit/persona'
import { persona as linh } from '@saigon/npc-linh/persona'
import { persona as mai } from '@saigon/npc-mai/persona'
import { persona as opera_visitor } from '@saigon/npc-opera-visitor/persona'
import { persona as park_stretch } from '@saigon/npc-park-stretch/persona'
import { persona as plaza_stroll } from '@saigon/npc-plaza-stroll/persona'
import { persona as postcard_reader } from '@saigon/npc-postcard-reader/persona'
import { persona as river_jogger } from '@saigon/npc-river-jogger/persona'
import { persona as son } from '@saigon/npc-son/persona'
import { persona as square_tourist } from '@saigon/npc-square-tourist/persona'
import { persona as tam } from '@saigon/npc-tam/persona'
import { persona as thao } from '@saigon/npc-thao/persona'
import { persona as vy } from '@saigon/npc-vy/persona'
import type { NpcId } from '../entities'
import { NPCS } from './derive'

/**
 * AI prompt bodies, keyed by NPC id. Server-only: import from
 * `@saigon/shared/personas`, never from the client. Neighbors ship a bespoke
 * body; residents compose the shared resident template unless they ship their
 * own non-empty persona (featured residents do). SHARED_RULES is still appended
 * by the server.
 */
const PACKAGE_PROMPTS: Partial<Record<NpcId, string>> = {
  hoa,
  tam,
  linh,
  ba,
  mai,
  alex,
  vy,
  son,
  thao,
  'bread-vendor': bread_vendor,
  'park-stretch': park_stretch,
  'square-tourist': square_tourist,
  'plaza-stroll': plaza_stroll,
  'river-jogger': river_jogger,
  'opera-visitor': opera_visitor,
  'postcard-reader': postcard_reader,
  'alley-diner': alley_diner,
}

function promptFor(id: NpcId): string {
  const pkg = PACKAGE_PROMPTS[id]
  if (pkg && pkg.trim().length > 0) return pkg
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
