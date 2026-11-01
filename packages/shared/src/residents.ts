import type { NpcId } from './entities'
import { EAST_RESIDENTS } from './residents-east'
import type { NpcPersona } from './world'
export const RESIDENTS = {
  ...EAST_RESIDENTS,
  'bread-vendor': {
    id: 'bread-vendor',
    name: 'Chú Bình',
    role: 'Bánh mì vendor',
    kind: 'resident',
    friendliness: 0,
    location: 'market',
    personality:
      'Observant and independent; cares about the neighborhood and bánh mì vendor.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the market.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the bánh mì vendor. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the fruit vendor. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the market regular. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the market courier. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the family shopper. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the coffee regular. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the café reader. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the commuter. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the student. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the park reader. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
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
    idleLine: {
      en: 'Hello! I am the morning exerciser. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
} satisfies Partial<Record<NpcId, NpcPersona>>

export { RESIDENT_ANCHORS } from './resident-anchors'
