import type { NpcStory } from '@saigon/npc-kit'
import { gag } from './seeds/gag'

export const story: NpcStory = {
  completion: {
    en: 'Thanks — bạn! Kindness — keeps pace. Catch your breath — with us — any time.',
    vi: 'Cảm ơn — bạn nha! Tử tế — cũng giữ nhịp. Bữa nào — ghé nghỉ chân — với tụi mình nhé.',
  },
  seeds: [
    gag,
    {
      payoff: {
        en: 'Linh — has the herbs! Thanks — bạn. Park lunch — is one step closer. Good pace — good neighbor.',
        vi: 'Chị Linh — nhận rau rồi! Cảm ơn — bạn nha. Bữa trưa công viên — gần hơn một bước. Nhịp tốt — hàng xóm tốt.',
      },
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
      text: {
        en: {
          title: 'Herbs on the way to the park',
          description: 'Bring these herbs to chị Linh in the park.',
        },
        vi: {
          title: 'Rau thơm trên đường ra công viên',
          description: 'Mang rau thơm này đến cho chị Linh ở công viên.',
        },
      },
    },
  ],
  domain: {
    home: 'river',
    locations: ['river', 'park', 'market'],
    npcs: ['ba', 'linh', 'hoa'],
    items: ['banana', 'herbs', 'coffee', 'noodles'],
    gifts: ['banana', 'coffee'],
  },
}
