import type { NpcId } from '../entities'
import type { Locale } from '../locale'
import { RESIDENT_SEEDS } from './resident-seeds'
import type { QuestSpec } from './schema'

/** Seed quests carry text per language; projected to a plain QuestSpec on use. */
export type SeedCatalog = Omit<QuestSpec, 'title' | 'description'> & {
  text: Record<Locale, { title: string; description: string }>
}

export const QUEST_SEEDS: SeedCatalog[] = [
  ...RESIDENT_SEEDS,
  {
    giverNpcId: 'hoa',
    text: {
      en: {
        title: 'Fresh herbs for a neighbor',
        description: 'Bring these fresh herbs to Chị Linh in the park.',
      },
      vi: {
        title: 'Rau thơm cho hàng xóm',
        description: 'Mang rau thơm này đến cho chị Linh ở công viên.',
      },
    },
    steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'tam',
    text: {
      en: {
        title: 'A riverside hello',
        description: 'Check on Ông Ba by the river and say hello.',
      },
      vi: {
        title: 'Lời chào bên sông',
        description: 'Ghé thăm ông Ba bên sông và chào ông một tiếng.',
      },
    },
    steps: [{ type: 'TALK_TO', npcId: 'ba' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'linh',
    text: {
      en: {
        title: 'A community lunch invitation',
        description:
          'Visit the market and invite Cô Hoa to our neighborhood lunch.',
      },
      vi: {
        title: 'Lời mời ăn trưa của xóm',
        description: 'Ghé chợ và mời cô Hoa đến bữa trưa chung của xóm.',
      },
    },
    steps: [
      { type: 'GO_TO', locationId: 'market' },
      { type: 'TALK_TO', npcId: 'hoa' },
    ],
    scope: 'solo',
  },
  {
    giverNpcId: 'ba',
    text: {
      en: {
        title: 'A view along the river',
        description: 'Visit the Opera House and find another side of our city.',
      },
      vi: {
        title: 'Ngắm cảnh dọc sông',
        description:
          'Ghé Nhà hát Thành phố và khám phá một góc khác của thành phố.',
      },
    },
    steps: [{ type: 'GO_TO', locationId: 'opera' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'mai',
    text: {
      en: {
        title: 'Coffee for Cô Hoa',
        description: 'Take this coffee across the market to Cô Hoa.',
      },
      vi: {
        title: 'Cà phê cho cô Hoa',
        description: 'Mang ly cà phê này qua chợ cho cô Hoa.',
      },
    },
    steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'hoa' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'alex',
    text: {
      en: {
        title: 'Light across the square',
        description: 'Visit the cathedral square and find the afternoon light.',
      },
      vi: {
        title: 'Ánh sáng qua quảng trường',
        description: 'Ghé quảng trường nhà thờ và tìm ánh nắng buổi chiều.',
      },
    },
    steps: [{ type: 'GO_TO', locationId: 'cathedral' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'vy',
    text: {
      en: {
        title: 'An evening walk',
        description:
          'Visit the food alley and look for a welcoming evening corner.',
      },
      vi: {
        title: 'Dạo phố buổi tối',
        description:
          'Ghé hẻm ẩm thực và tìm một góc phố buổi tối thật ấm cúng.',
      },
    },
    steps: [{ type: 'GO_TO', locationId: 'alley' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'son',
    text: {
      en: {
        title: 'Room for a river view',
        description: 'Visit the riverside to bring back a little inspiration.',
      },
      vi: {
        title: 'Chỗ cho cảnh sông',
        description: 'Ghé bờ sông để mang về chút cảm hứng.',
      },
    },
    steps: [{ type: 'GO_TO', locationId: 'river' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'thao',
    text: {
      en: {
        title: 'An echo across the square',
        description: 'Listen to the city at the cathedral square.',
      },
      vi: {
        title: 'Tiếng vọng qua quảng trường',
        description: 'Lắng nghe thành phố ở quảng trường nhà thờ.',
      },
    },
    steps: [{ type: 'GO_TO', locationId: 'cathedral' }],
    scope: 'solo',
  },
]

export function seedsFor(npcId: NpcId, locale: Locale = 'en'): QuestSpec[] {
  return QUEST_SEEDS.filter((seed) => seed.giverNpcId === npcId).map(
    ({ text, ...seed }) => ({
      ...seed,
      title: text[locale].title,
      description: text[locale].description,
      steps: seed.steps.map((step) => ({ ...step })),
    })
  )
}
