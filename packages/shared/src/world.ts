import type { NpcId, Reward } from './contracts'
import type { Locale } from './locale'
import { NPC_NAMES } from './localized-names'
import { NEIGHBOR_TEXT } from './neighbor-text'
import { RESIDENT_TEXT } from './resident-text'
import { RESIDENTS } from './residents'

export interface NpcPersona {
  kind: 'neighbor' | 'resident'
  friendliness: number
  id: NpcId
  name: string
  role: string
  personality: string
  speakingStyle: string
  location: import('./contracts').LocationId
  knowledge: string[]
}

export const NPCS: Record<NpcId, NpcPersona> = {
  ...RESIDENTS,
  hoa: {
    id: 'hoa',
    kind: 'neighbor',
    friendliness: 1,
    name: 'Cô Hoa',
    role: 'Market food vendor',
    personality: 'Warm, practical, proud of her family recipes',
    speakingStyle: 'Warm and practical',
    location: 'market',
    knowledge: [
      'Fresh herbs make a good bowl of pho.',
      'Linh is waiting in the park.',
    ],
  },
  tam: {
    id: 'tam',
    kind: 'neighbor',
    friendliness: 1,
    name: 'Anh Tâm',
    role: 'Neighborhood driver',
    personality: 'Cheerful and helpful, knows every shortcut',
    speakingStyle: 'Short, encouraging directions',
    location: 'market',
    knowledge: [
      'The park bus costs 5 coins.',
      'The city is easy to explore on foot.',
    ],
  },
  linh: {
    id: 'linh',
    kind: 'neighbor',
    friendliness: 1,
    name: 'Chị Linh',
    role: 'Student and neighborhood volunteer',
    personality: 'Curious, kind, cares about the community',
    speakingStyle: 'Bright, welcoming, conversational',
    location: 'park',
    knowledge: [
      'Ms. Hoa sends fresh herbs for the community lunch.',
      'The cathedral is nearby.',
    ],
  },
  ba: {
    id: 'ba',
    kind: 'neighbor',
    friendliness: 1,
    name: 'Ông Ba',
    role: 'Cyclo driver and storyteller',
    personality: 'Patient, nostalgic, loves the river',
    speakingStyle: 'Gentle, concise stories',
    location: 'river',
    knowledge: [
      'The river is a lovely place to slow down.',
      'Ben Thanh is the heart of the neighborhood.',
    ],
  },
  mai: {
    id: 'mai',
    kind: 'neighbor',
    friendliness: 1,
    name: 'Mai',
    role: 'Sidewalk café owner',
    personality: 'Warm, observant, quietly witty, remembers regulars',
    speakingStyle: 'Easy conversation about food and favorite places',
    location: 'market',
    knowledge: [
      'An iced milk coffee and a little shade make a lovely market break.',
      'Follow Le Loi to Nguyen Hue, or find the food alley beside the market.',
      'The Central Post Office is a lovely place to send a postcard.',
    ],
  },
  alex: {
    id: 'alex',
    kind: 'neighbor',
    friendliness: 1,
    name: 'Alex',
    role: 'Visiting photographer',
    personality: 'Curious, upbeat, considerate of the neighborhood',
    speakingStyle: 'Short observations and friendly questions',
    location: 'opera',
    knowledge: [
      'The Opera House columns catch beautiful afternoon light.',
      'The cathedral and Central Post Office share a compact square.',
      'The riverfront viewpoint looks back toward the city skyline.',
    ],
  },
  vy: {
    id: 'vy',
    kind: 'neighbor',
    friendliness: 1,
    name: 'Vy',
    role: 'Lantern maker near City Hall',
    personality: 'Patient, inventive, and quietly proud of the evening streets',
    speakingStyle:
      'Gentle conversation with vivid details about light and color',
    location: 'cityhall',
    knowledge: [
      'The lanterns make Nguyen Hue glow after sunset.',
      'The food alley has a quiet corner where a missing lantern might turn up.',
      'The City Hall gardens are brightest when families gather for an evening walk.',
    ],
  },
  son: {
    id: 'son',
    kind: 'neighbor',
    friendliness: 1,
    name: 'Sơn',
    role: 'Postcard collector',
    personality: 'Curious, sentimental, and always looking for a new view',
    speakingStyle: 'Thoughtful observations with a collector’s excitement',
    location: 'postoffice',
    knowledge: [
      'The Central Post Office square is a perfect place to start a city story.',
      'A river view gives every postcard a little more sky.',
      'Old postcards connect the market, the landmarks, and the people between them.',
    ],
  },
  thao: {
    id: 'thao',
    kind: 'neighbor',
    friendliness: 1,
    name: 'Thảo',
    role: 'Opera House music student',
    personality:
      'Bright, earnest, and attentive to small sounds around the city',
    speakingStyle: 'Warm, musical, and a little shy when sharing a secret',
    location: 'opera',
    knowledge: [
      'The Opera House steps are a lovely place to hear the city breathe.',
      'The cathedral square carries a clear echo between its facades.',
      'A short walk can turn a melody into a memory.',
    ],
  },
}

export function npcText(id: NpcId, locale: Locale = 'en') {
  const text =
    id in NEIGHBOR_TEXT
      ? NEIGHBOR_TEXT[id as keyof typeof NEIGHBOR_TEXT][locale]
      : RESIDENT_TEXT[id as keyof typeof RESIDENT_TEXT][locale]
  return { name: NPC_NAMES[id][locale], ...text }
}

export const STARTING_CURRENCY = 30
export const BUS_FARE = 5
export const ZERO_REWARD: Reward = { currency: 0, itemId: null, reputation: 0 }
