import type {
  ItemId,
  Locale,
  LocationId,
  MarketItemId,
  MilestoneId,
  NpcId,
} from './ids'

export type Text = Record<Locale, string>

export interface NpcActivity {
  conversationHints: { first: Text; returning: Text }
  text: Text
  animation: string
  movement?: 'walk'
  prop?: 'food/cup-coffee' | 'food/bowl-soup' | 'food/loaf-baguette'
}

export type NpcActivities = Record<string, NpcActivity> & {
  default: NpcActivity
}

/** Per-locale role and local knowledge shown in conversation and prompts. */
export interface LocalizedProfile {
  role: string
  knowledge: string[]
}

export interface NpcProfile {
  kind: 'neighbor' | 'resident'
  friendliness: number
  /** Localized display names. The world uses the Vietnamese name as its label. */
  names: Text
  /** Per-locale role and knowledge. */
  text: Record<Locale, LocalizedProfile>
  personality: string
  speakingStyle: string
  home: LocationId
  /** Residents expose one idle line per locale. */
  idle?: Text
  /** Opt in to addressing the player by name in greetings via a {name} placeholder. */
  greetsByName?: boolean
}

/** A quest step. Mirrors the shared QuestSpec step union structurally. */
export type QuestStep =
  | { type: 'GO_TO'; locationId: LocationId }
  | { type: 'TALK_TO'; npcId: NpcId }
  | { type: 'DELIVER'; itemId: ItemId; npcId: NpcId }
  | { type: 'BUY'; marketItemId: MarketItemId }
  | { type: 'BRING'; itemId: ItemId; npcId: NpcId }

export interface SeedQuest {
  text: Record<Locale, { title: string; description: string }>
  steps: QuestStep[]
  scope: 'solo' | 'party'
  /** Giver's completion punchline that resolves the setup (Phase 1a). */
  payoff?: Text
  /** Rewrites the final step once every earlier step is done (Phase 2). */
  twist?: { step: QuestStep; line: Text }
  /** Hides step 0 behind a riddle until the city reveals it (Phase 3b). */
  riddle?: { text: Text }
  /** Overrides the reward item (Phase 4 milestone components). */
  gift?: ItemId
  /** Marks this as a milestone errand (Phase 4). */
  milestone?: MilestoneId
  /** Offered first when the client runs the `?demo` recording path. */
  demo?: true
}

export interface QuestDomain {
  home: LocationId
  locations: LocationId[]
  npcs: NpcId[]
  items: ItemId[]
  gifts: ItemId[]
}

export interface NpcStory {
  seeds: SeedQuest[]
  domain: QuestDomain
  completion?: Text
}

/** Signature cosmetic/vehicle/pet unlocks a neighbor grants. */
export interface UnlockSpec {
  id: string
  kind: 'cosmetic' | 'vehicle' | 'pet'
  slot: 'hat' | 'outfit' | 'accessory' | 'vehicle' | 'pet'
  tier: 'neutral' | 'warm' | 'close'
  model?: string
  scale?: number
  speed?: number
  palette?: Record<string, string>
  attachment?: 'head' | 'torso'
  fit?: Partial<
    Record<
      'man' | 'woman',
      {
        position?: [number, number, number]
        rotation?: [number, number, number]
        scale?: number
      }
    >
  >
  outfitModels?: Partial<Record<'man' | 'woman', string>>
}

/** How the NPC renders in the world and in its portrait. */
export interface NpcLook {
  /** Base body key, or 'own' to load the package's own model. */
  body: 'male-a' | 'male-b' | 'female-a' | 'female-b' | 'own'
  /** World marker / portrait tint. */
  color: string
  /** Portrait background CSS value (var or color). */
  portraitBg?: string
  animation: string
  yaw?: number
  scale?: number
  /** Declares a packaged avatar portrait exists. */
  avatar?: boolean
}

export interface NpcPlace {
  /** World position [x, z]. */
  at: [number, number]
  /** Optional 3D anchor [x, y, z] used by the city snapshot (neighbors). */
  anchor?: [number, number, number]
  walk?: [number, number]
  phase?: number
}

export interface NpcDefinition {
  id: NpcId
  activities: NpcActivities
  profile: NpcProfile
  story: NpcStory
  unlocks: UnlockSpec[]
  look: NpcLook
  place: NpcPlace
}

/** Identity helper: validates the id at the type level and returns the definition. */
export function defineNpc<const T extends NpcDefinition>(def: T): T {
  return def
}

/** Resident defaults: fills the repetitive role/knowledge/idle text from today's resident() template. */
export interface ResidentInput {
  id: NpcId
  activities: NpcActivities
  name: Text
  completion?: Text
  helloPayoff?: Text
  roles: { en: string; vi: string }
  place: { en: string; vi: string }
  home: LocationId
  friendliness?: number
  look: NpcLook
  at: [number, number]
  walk?: [number, number]
  phase?: number
  yaw?: number
}

function residentText(
  roles: { en: string; vi: string },
  place: { en: string; vi: string }
): Record<Locale, LocalizedProfile & { idleLine: string }> {
  return {
    en: {
      role: roles.en,
      knowledge: [
        `I spend my days around ${place.en}.`,
        'A small favor helps neighbors get to know one another.',
      ],
      idleLine: `Hello! I'm the ${roles.en.toLowerCase()}. How is your walk today?`,
    },
    vi: {
      role: roles.vi,
      knowledge: [
        `Mình hay ở quanh ${place.vi}.`,
        'Một việc nhỏ cũng giúp hàng xóm gần nhau hơn.',
      ],
      idleLine: `Chào bạn! Mình là ${roles.vi.toLowerCase()}. Hôm nay bạn đi dạo thế nào?`,
    },
  }
}

/** Build a resident definition from today's resident() defaults. */
export function defineResident(input: ResidentInput): NpcDefinition {
  const rt = residentText(input.roles, input.place)
  const friendliness = input.friendliness ?? 0
  const home = input.home
  const seedTarget = home === 'park' ? 'hoa' : 'linh'
  const seedPlaceEn =
    home === 'park' ? 'Ms. Hoa at the market' : 'Linh in the park'
  const seedPlaceVi = home === 'park' ? 'cô Hoa ở chợ' : 'chị Linh ở công viên'
  return {
    id: input.id,
    activities: input.activities,
    profile: {
      kind: 'resident',
      friendliness,
      names: input.name,
      text: {
        en: { role: rt.en.role, knowledge: rt.en.knowledge },
        vi: { role: rt.vi.role, knowledge: rt.vi.knowledge },
      },
      personality: `Observant and independent; cares about the neighborhood and ${input.roles.en.toLowerCase()}.`,
      speakingStyle: 'Brief, civil conversation with local detail',
      home,
      idle: { en: rt.en.idleLine, vi: rt.vi.idleLine },
    },
    story: {
      ...(input.completion ? { completion: input.completion } : {}),
      seeds: [
        {
          scope: 'solo',
          ...(input.helloPayoff ? { payoff: input.helloPayoff } : {}),
          steps: [{ type: 'TALK_TO', npcId: seedTarget }],
          text: {
            en: {
              title: `${input.name.en}'s neighborhood hello`,
              description: `Say hello to ${seedPlaceEn} for the ${input.roles.en.toLowerCase()}, then return.`,
            },
            vi: {
              title: `Lời nhắn của ${input.name.vi}`,
              description: `Gửi lời chào đến ${seedPlaceVi} rồi quay lại nhé.`,
            },
          },
        },
      ],
      domain: {
        home,
        locations: [home, 'market', 'park'],
        npcs: ['hoa', 'linh'],
        items: ['coffee', 'banana'],
        gifts: ['postcard'],
      },
    },
    unlocks: [],
    look: input.look,
    place: {
      at: input.at,
      ...(input.walk ? { walk: input.walk } : {}),
      ...(input.phase !== undefined ? { phase: input.phase } : {}),
    },
  }
}
