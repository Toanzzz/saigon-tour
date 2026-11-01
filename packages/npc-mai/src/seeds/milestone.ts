import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Mai's evening-concert errand. Visit the alley roaster, then let Cô Hoa vouch
 * for the beans. Earns the coffee-beans component for the concert at City Hall.
 */
export const milestone: SeedQuest = {
  scope: 'solo',
  milestone: 'evening-concert',
  gift: 'coffee-beans',
  steps: [
    { type: 'GO_TO', locationId: 'alley' },
    { type: 'TALK_TO', npcId: 'hoa' },
  ],
  text: {
    en: {
      title: 'Beans worthy of a concert',
      description:
        'Vy wants real beans for the evening concert. Walk to the alley roaster, breathe in the smoke, then let Cô Hoa taste and vouch for them. Tasting notes: dusk, a little stage fright, a very big encore.',
    },
    vi: {
      title: 'Cà phê xứng tầm đêm nhạc',
      description:
        'Vy muốn có cà phê thiệt cho đêm nhạc. Ghé lò rang trong hẻm, hít chút khói thơm, rồi để Cô Hoa nếm thử và gật đầu giùm. Hương vị: chạng vạng, chút run trước giờ diễn, và một khúc kết thiệt dài.',
    },
  },
  payoff: {
    en: 'Hoa approved the beans in two bowls flat. For the concert, Vy, roasted just right.',
    vi: 'Cô Hoa duyệt cà phê gọn trong hai tô. Rang vừa đúng độ, để dành cho đêm nhạc của Vy.',
  },
}
