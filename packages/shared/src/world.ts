import type { NpcId, Quest, Reward } from './contracts'

export interface NpcPersona {
  id: NpcId
  name: string
  role: string
  personality: string
  speakingStyle: string
  location: import('./contracts').LocationId
  knowledge: string[]
}

export const NPCS: Record<NpcId, NpcPersona> = {
  hoa: {
    id: 'hoa',
    name: 'Cô Hoa',
    role: 'Market food vendor',
    personality: 'Warm, practical, proud of her family recipes',
    speakingStyle: 'Friendly English with brief Vietnamese greetings',
    location: 'market',
    knowledge: [
      'Fresh herbs make a good bowl of phở.',
      'Chị Linh is waiting in the park.',
    ],
  },
  tam: {
    id: 'tam',
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
    name: 'Chị Linh',
    role: 'Student and neighborhood volunteer',
    personality: 'Curious, kind, cares about the community',
    speakingStyle: 'Bright, welcoming, conversational',
    location: 'park',
    knowledge: [
      'Cô Hoa sends fresh herbs for the community lunch.',
      'The cathedral is nearby.',
    ],
  },
  ba: {
    id: 'ba',
    name: 'Ông Ba',
    role: 'Cyclo driver and storyteller',
    personality: 'Patient, nostalgic, loves the river',
    speakingStyle: 'Gentle, concise stories',
    location: 'river',
    knowledge: [
      'The river is a lovely place to slow down.',
      'Bến Thành is the heart of the neighborhood.',
    ],
  },
  mai: {
    id: 'mai',
    name: 'Mai',
    role: 'Sidewalk café owner',
    personality: 'Warm, observant, quietly witty, remembers regulars',
    speakingStyle: 'Easy conversation with short Vietnamese food phrases',
    location: 'market',
    knowledge: [
      'A cà phê sữa and a little shade make a lovely market break.',
      'Follow Lê Lợi to Nguyễn Huệ, or find the food alley beside the market.',
      'The Central Post Office is a lovely place to send a postcard.',
    ],
  },
  alex: {
    id: 'alex',
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
    name: 'Vy',
    role: 'Lantern maker near City Hall',
    personality: 'Patient, inventive, and quietly proud of the evening streets',
    speakingStyle: 'Gentle English with vivid details about light and color',
    location: 'cityhall',
    knowledge: [
      'The lanterns make Nguyễn Huệ glow after sunset.',
      'The food alley has a quiet corner where a missing lantern might turn up.',
      'The City Hall gardens are brightest when families gather for an evening walk.',
    ],
  },
  son: {
    id: 'son',
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
    name: 'Thảo',
    role: 'Opera House music student',
    personality:
      'Bright, earnest, and attentive to small sounds around the city',
    speakingStyle: 'Warm, musical, and a little shy when sharing a secret',
    location: 'opera',
    knowledge: [
      'The Opera House steps are a lovely place to hear the city breathe.',
      'The cathedral square carries a clear echo between its façades.',
      'A short walk can turn a melody into a memory.',
    ],
  },
}

export const STARTING_CURRENCY = 30
export const BUS_FARE = 5
export const ZERO_REWARD: Reward = { currency: 0, itemId: null, reputation: 0 }
export const DEMO_QUEST: Quest = {
  id: 'hoa-herbs-delivery',
  title: 'A little taste of home',
  description:
    'Take Cô Hoa’s fresh herbs to Chị Linh in the park. Catch a bus across the neighborhood, or enjoy the walk.',
  objective: { type: 'DELIVER', itemId: 'herbs', npcId: 'linh' },
  reward: { currency: 50, itemId: 'postcard', reputation: 1 },
  giverNpcId: 'hoa',
}

export const SECRET_QUESTS = {
  'cityhall-lanterns': {
    id: 'cityhall-lanterns',
    title: 'A lantern for the evening walk',
    description:
      'Find the quiet food-alley corner where Vy’s missing lantern is waiting, then return to City Hall.',
    objective: { type: 'GO_TO', locationId: 'alley' },
    reward: { currency: 20, itemId: 'coffee', reputation: 1 },
    giverNpcId: 'vy',
  },
  'postoffice-river-postcard': {
    id: 'postoffice-river-postcard',
    title: 'A postcard with room to breathe',
    description:
      'Visit the riverfront and bring Sơn one wide view for his growing postcard collection.',
    objective: { type: 'GO_TO', locationId: 'river' },
    reward: { currency: 25, itemId: 'photo', reputation: 1 },
    giverNpcId: 'son',
  },
  'opera-cathedral-note': {
    id: 'opera-cathedral-note',
    title: 'A note across the square',
    description:
      'Carry Thảo’s melody from the Opera House to the cathedral square and listen for its echo.',
    objective: { type: 'GO_TO', locationId: 'cathedral' },
    reward: { currency: 30, itemId: 'postcard', reputation: 1 },
    giverNpcId: 'thao',
  },
} as const satisfies Record<string, Quest>

export function objectiveSatisfied(
  quest: Quest,
  world: import('./contracts').WorldState
): boolean {
  const objective = quest.objective
  switch (objective.type) {
    case 'GO_TO':
      return world.visitedLocations.includes(objective.locationId)
    case 'TALK_TO':
      return world.talkedTo.includes(objective.npcId)
    case 'COLLECT':
      return (world.inventory[objective.itemId] ?? 0) >= objective.count
    case 'DELIVER':
      return world.deliveredItems.includes(
        `${objective.itemId}:${objective.npcId}`
      )
  }
}

export const TEAM_QUEST: Quest = {
  id: 'hoa-team-lunch',
  title: 'Lunch tastes better together',
  description:
    'Bring your assigned dishes to Chị Linh in the park, then check with Cô Hoa together.',
  objective: { type: 'TALK_TO', npcId: 'hoa' },
  reward: { currency: 40, itemId: 'photo', reputation: 2 },
  giverNpcId: 'hoa',
}
