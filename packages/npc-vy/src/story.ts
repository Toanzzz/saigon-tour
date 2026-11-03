import type { NpcStory } from '@saigon/npc-kit'
import { arc } from './seeds/arc'
import { gag } from './seeds/gag'
import { milestone } from './seeds/milestone'

export const story: NpcStory = {
  completion: {
    en: 'Thank you. You have made this little corner of the city feel warmer. I will think of you when the lanterns come on.',
    vi: 'Cảm ơn bạn nha. Nhờ bạn mà góc phố này ấm hơn một chút. Lúc lên đèn, mình sẽ nhớ tới bạn.',
  },
  seeds: [
    arc,
    gag,
    {
      payoff: {
        en: 'You found a welcoming corner in the food alley. Thank you for taking that little walk! Every warm doorway feels like another lantern.',
        vi: 'Bạn tìm được góc ấm trong hẻm ẩm thực rồi. Cảm ơn đã đi một vòng nha! Mỗi ô cửa đón người như thêm một ngọn đèn vậy.',
      },
      scope: 'solo',
      steps: [{ type: 'GO_TO', locationId: 'alley' }],
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
    },
    milestone,
  ],
  domain: {
    home: 'cityhall',
    locations: ['cityhall', 'alley', 'market', 'opera'],
    npcs: ['hoa', 'mai', 'thao', 'alex'],
    items: ['postcard', 'photo', 'coffee', 'banana'],
    gifts: ['coffee', 'postcard'],
  },
}
