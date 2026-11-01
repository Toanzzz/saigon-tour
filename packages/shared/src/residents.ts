import type { NpcId } from './entities'
import { EAST_RESIDENTS } from './residents-east'
import type { NpcPersona } from './world'
export const RESIDENTS = {
  ...EAST_RESIDENTS,
  'bread-vendor': {
    id: 'bread-vendor',
    name: 'Chú Bình',
    role: 'Sandwich vendor',
    kind: 'resident',
    friendliness: 0,
    location: 'market',
    personality:
      'Observant and independent; cares about the neighborhood and sandwich vendor.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the market.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  'fruit-vendor': {
    id: 'fruit-vendor',
    name: 'Cô Hạnh',
    role: 'Fruit vendor',
    kind: 'resident',
    friendliness: 0,
    location: 'market',
    personality:
      'Observant and independent; cares about the neighborhood and fruit vendor.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the market.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  'market-browse': {
    id: 'market-browse',
    name: 'Ngọc',
    role: 'Market regular',
    kind: 'resident',
    friendliness: 0,
    location: 'market',
    personality:
      'Observant and independent; cares about the neighborhood and market regular.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the market.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  'market-walk': {
    id: 'market-walk',
    name: 'Đạt',
    role: 'Market courier',
    kind: 'resident',
    friendliness: 0,
    location: 'market',
    personality:
      'Observant and independent; cares about the neighborhood and market courier.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the market.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  'market-family': {
    id: 'market-family',
    name: 'Chị Hương',
    role: 'Family shopper',
    kind: 'resident',
    friendliness: 0,
    location: 'market',
    personality:
      'Observant and independent; cares about the neighborhood and family shopper.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the market.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  'coffee-friend': {
    id: 'coffee-friend',
    name: 'Anh Đức',
    role: 'Coffee regular',
    kind: 'resident',
    friendliness: 0,
    location: 'market',
    personality:
      'Observant and independent; cares about the neighborhood and coffee regular.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the market.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  'coffee-reader': {
    id: 'coffee-reader',
    name: 'Quỳnh',
    role: 'Café reader',
    kind: 'resident',
    friendliness: -1,
    location: 'market',
    personality:
      'Observant and independent; cares about the neighborhood and café reader.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the market.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  commuter: {
    id: 'commuter',
    name: 'Tuấn',
    role: 'Commuter',
    kind: 'resident',
    friendliness: 0,
    location: 'market',
    personality:
      'Observant and independent; cares about the neighborhood and commuter.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the market.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  student: {
    id: 'student',
    name: 'Minh',
    role: 'Student',
    kind: 'resident',
    friendliness: 0,
    location: 'park',
    personality:
      'Observant and independent; cares about the neighborhood and student.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the park.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  'park-reader': {
    id: 'park-reader',
    name: 'Chú Phúc',
    role: 'Park reader',
    kind: 'resident',
    friendliness: -1,
    location: 'park',
    personality:
      'Observant and independent; cares about the neighborhood and park reader.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the park.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
  'park-stretch': {
    id: 'park-stretch',
    name: 'Yến',
    role: 'Morning exerciser',
    kind: 'resident',
    friendliness: 0,
    location: 'park',
    personality:
      'Observant and independent; cares about the neighborhood and morning exerciser.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the park.',
      'A small favor helps neighbors get to know one another.',
    ],
  },
} satisfies Partial<Record<NpcId, NpcPersona>>

export { RESIDENT_ANCHORS } from './resident-anchors'
