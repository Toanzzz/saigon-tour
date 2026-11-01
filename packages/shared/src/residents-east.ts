import type { NpcId } from './entities'
import type { NpcPersona } from './world'
export const EAST_RESIDENTS = {
  'plaza-friends': {
    id: 'plaza-friends',
    name: 'Hà',
    role: 'Plaza neighbor',
    kind: 'resident',
    friendliness: 0,
    location: 'cityhall',
    personality:
      'Observant and independent; cares about the neighborhood and plaza neighbor.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the cityhall.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the plaza neighbor. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
  'plaza-stroll': {
    id: 'plaza-stroll',
    name: 'Khải',
    role: 'Evening stroller',
    kind: 'resident',
    friendliness: 0,
    location: 'cityhall',
    personality:
      'Observant and independent; cares about the neighborhood and evening stroller.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the cityhall.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the evening stroller. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
  'opera-visitor': {
    id: 'opera-visitor',
    name: 'Diễm',
    role: 'Opera visitor',
    kind: 'resident',
    friendliness: -2,
    location: 'opera',
    personality:
      'Observant and independent; cares about the neighborhood and opera visitor.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the opera.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the opera visitor. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
  'postcard-reader': {
    id: 'postcard-reader',
    name: 'Bảo',
    role: 'Postcard reader',
    kind: 'resident',
    friendliness: 0,
    location: 'postoffice',
    personality:
      'Observant and independent; cares about the neighborhood and postcard reader.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the postoffice.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the postcard reader. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
  'square-tourist': {
    id: 'square-tourist',
    name: 'An',
    role: 'Square visitor',
    kind: 'resident',
    friendliness: 0,
    location: 'cathedral',
    personality:
      'Observant and independent; cares about the neighborhood and square visitor.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the cathedral.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the square visitor. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
  'riverside-friends': {
    id: 'riverside-friends',
    name: 'Nhi',
    role: 'River neighbor',
    kind: 'resident',
    friendliness: 0,
    location: 'river',
    personality:
      'Observant and independent; cares about the neighborhood and river neighbor.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the river.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the river neighbor. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
  'river-jogger': {
    id: 'river-jogger',
    name: 'Long',
    role: 'Riverside runner',
    kind: 'resident',
    friendliness: 0,
    location: 'river',
    personality:
      'Observant and independent; cares about the neighborhood and riverside runner.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the river.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the riverside runner. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
  'alley-vendor': {
    id: 'alley-vendor',
    name: 'Chú Lộc',
    role: 'Alley cook',
    kind: 'resident',
    friendliness: 0,
    location: 'alley',
    personality:
      'Observant and independent; cares about the neighborhood and alley cook.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the alley.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the alley cook. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
  'alley-diner': {
    id: 'alley-diner',
    name: 'Trang',
    role: 'Food enthusiast',
    kind: 'resident',
    friendliness: 0,
    location: 'alley',
    personality:
      'Observant and independent; cares about the neighborhood and food enthusiast.',
    speakingStyle: 'Brief, civil conversation with local detail',
    knowledge: [
      'I spend my days around the alley.',
      'A small favor helps neighbors get to know one another.',
    ],
    idleLine: {
      en: 'Hello! I am the food enthusiast. How is your walk?',
      vi: 'Chào bạn! Hôm nay bạn đi dạo thế nào?',
    },
  },
} satisfies Partial<Record<NpcId, NpcPersona>>
