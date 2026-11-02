import type { NpcDefinition, UnlockSpec } from '@saigon/npc-kit'
import {
  type ItemId,
  type Locale,
  type LocationId,
  NEIGHBOR_IDS,
  type NeighborId,
  type NpcId,
} from '@saigon/npc-kit'
import { NPC_REGISTRY } from './registry'

export type Text = Record<Locale, string>

/** Every registered definition, in registry (and thus id-list) order. */
const DEFS = Object.values(NPC_REGISTRY) as NpcDefinition[]
const byId = NPC_REGISTRY as Record<NpcId, NpcDefinition>

/** Resident persona knowledge used the home location's short phrase, distinct from RESIDENT_TEXT's full place word. */
const HOME_PHRASE: Record<LocationId, string> = {
  market: 'the market',
  park: 'the park',
  cityhall: 'the City Hall',
  cathedral: 'the cathedral',
  river: 'the river',
  opera: 'the opera',
  postoffice: 'the Central Post Office',
  alley: 'the alley',
}

/** Persona shape kept from the original world.ts. */
export interface NpcPersona {
  kind: 'neighbor' | 'resident'
  friendliness: number
  id: NpcId
  name: string
  role: string
  personality: string
  speakingStyle: string
  location: LocationId
  knowledge: string[]
  greetsByName: boolean
}

function persona(def: NpcDefinition): NpcPersona {
  const knowledge =
    def.profile.kind === 'resident'
      ? [
          `I spend my days around ${HOME_PHRASE[def.profile.home]}.`,
          'A small favor helps neighbors get to know one another.',
        ]
      : def.profile.text.en.knowledge
  return {
    id: def.id,
    kind: def.profile.kind,
    friendliness: def.profile.friendliness,
    name: def.profile.names.vi,
    role: def.profile.text.en.role,
    personality: def.profile.personality,
    speakingStyle: def.profile.speakingStyle,
    location: def.profile.home,
    knowledge,
    greetsByName: def.profile.greetsByName ?? false,
  }
}

function entries<V>(fn: (def: NpcDefinition) => V): Record<NpcId, V> {
  return Object.fromEntries(DEFS.map((def) => [def.id, fn(def)])) as Record<
    NpcId,
    V
  >
}

export const NPCS: Record<NpcId, NpcPersona> = entries(persona)

export const NPC_NAMES: Record<NpcId, Text> = entries((d) => ({
  en: d.profile.names.en,
  vi: d.profile.names.vi,
}))

export const NEIGHBOR_TEXT: Record<
  NeighborId,
  Record<Locale, { role: string; knowledge: string[] }>
> = Object.fromEntries(
  NEIGHBOR_IDS.map((id) => [
    id,
    {
      en: byId[id].profile.text.en,
      vi: byId[id].profile.text.vi,
    },
  ])
) as Record<NeighborId, Record<Locale, { role: string; knowledge: string[] }>>

/** Resident text keeps the idle line the template produced. */
export const RESIDENT_TEXT = Object.fromEntries(
  DEFS.filter((d) => d.profile.kind === 'resident').map((d) => [
    d.id,
    {
      en: { ...d.profile.text.en, idleLine: d.profile.idle?.en ?? '' },
      vi: { ...d.profile.text.vi, idleLine: d.profile.idle?.vi ?? '' },
    },
  ])
) as Record<
  Exclude<NpcId, NeighborId>,
  Record<Locale, { role: string; knowledge: string[]; idleLine: string }>
>

export const RESIDENTS = Object.fromEntries(
  DEFS.filter((d) => d.profile.kind === 'resident').map((d) => [
    d.id,
    persona(d),
  ])
) as Record<Exclude<NpcId, NeighborId>, NpcPersona>

export const RESIDENT_ANCHORS = Object.fromEntries(
  DEFS.filter((d) => d.profile.kind === 'resident').map((d) => [
    d.id,
    {
      at: d.place.at,
      ...(d.place.walk ? { walk: d.place.walk } : {}),
    },
  ])
) as Record<
  Exclude<NpcId, NeighborId>,
  { at: [number, number]; walk?: [number, number] }
>

export const NPC_POSITIONS = Object.fromEntries(
  NEIGHBOR_IDS.map((id) => [
    id,
    byId[id].place.anchor as [number, number, number],
  ])
) as Record<NeighborId, [number, number, number]>

/** How each NPC renders in the world and in its portrait. New export; drives client PEOPLE and RESIDENT_VISUALS. */
export interface NpcLook {
  id: NpcId
  kind: 'neighbor' | 'resident'
  body: 'male-a' | 'male-b' | 'female-a' | 'female-b' | 'own'
  color: string
  portraitBg?: string
  animation: string
  yaw?: number
  scale?: number
  avatar?: boolean
  at: [number, number]
  walk?: [number, number]
  phase?: number
}

export const NPC_LOOKS: Record<NpcId, NpcLook> = entries((d) => ({
  id: d.id,
  kind: d.profile.kind,
  body: d.look.body,
  color: d.look.color,
  portraitBg: d.look.portraitBg,
  animation: d.look.animation,
  ...(d.look.yaw !== undefined ? { yaw: d.look.yaw } : {}),
  ...(d.look.scale !== undefined ? { scale: d.look.scale } : {}),
  ...(d.look.avatar !== undefined ? { avatar: d.look.avatar } : {}),
  at: d.place.at,
  ...(d.place.walk ? { walk: d.place.walk } : {}),
  ...(d.place.phase !== undefined ? { phase: d.place.phase } : {}),
}))

/** Seed catalogs carry per-locale text; projected to a plain QuestSpec on use. */
export interface QuestDomain {
  home: LocationId
  locations: LocationId[]
  npcs: NpcId[]
  items: ItemId[]
  gifts: ItemId[]
}

export const QUEST_DOMAINS: Record<NpcId, QuestDomain> = entries(
  (d) => d.story.domain
)

type Seed = NpcDefinition['story']['seeds'][number]

export interface DerivedSeed {
  giverNpcId: NpcId
  scope: 'solo' | 'party'
  steps: Seed['steps']
  text: Record<Locale, { title: string; description: string }>
  payoff?: Seed['payoff']
  twist?: Seed['twist']
  riddle?: Seed['riddle']
  gift?: Seed['gift']
  milestone?: Seed['milestone']
  demo?: Seed['demo']
}

export const QUEST_SEEDS: DerivedSeed[] = DEFS.flatMap((d) =>
  d.story.seeds.map((seed) => ({
    giverNpcId: d.id,
    scope: seed.scope,
    steps: seed.steps,
    text: seed.text,
    ...(seed.payoff ? { payoff: seed.payoff } : {}),
    ...(seed.twist ? { twist: seed.twist } : {}),
    ...(seed.riddle ? { riddle: seed.riddle } : {}),
    ...(seed.gift ? { gift: seed.gift } : {}),
    ...(seed.milestone ? { milestone: seed.milestone } : {}),
    ...(seed.demo ? { demo: seed.demo } : {}),
  }))
)

/** Signature unlock specs per neighbor, flattened. Each carries its giver. */
export type UnlockWithGiver = UnlockSpec & { giver: NeighborId }

export const UNLOCK_SPECS: UnlockWithGiver[] = NEIGHBOR_IDS.flatMap((id) =>
  byId[id].unlocks.map((u) => ({ ...u, giver: id }))
)
