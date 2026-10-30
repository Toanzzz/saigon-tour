import type { NpcId, Quest, Reward } from './contracts'

export interface NpcPersona {
  id: NpcId
  name: string
  role: string
  personality: string
  speakingStyle: string
  location: 'market' | 'park' | 'cathedral' | 'river'
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
