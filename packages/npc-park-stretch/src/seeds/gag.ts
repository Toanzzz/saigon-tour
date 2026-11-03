import type { SeedQuest } from '@saigon/npc-kit'

/** Yến's running gag: every errand is an exercise rep carried at shoulder height. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'banana', npcId: 'linh' }],
  text: {
    en: {
      title: 'A shoulder-height delivery',
      description:
        'Perfect rep, bạn: take this banana to chị Linh in the park, but carry it at shoulder height the whole way — for the gains. Counts as a set.',
    },
    vi: {
      title: 'Giao hàng ngang vai',
      description:
        'Một hiệp hoàn hảo nè bạn: mang trái chuối này cho chị Linh ở công viên, mà phải xách ngang vai suốt đường — cho lên cơ. Tính là một set.',
    },
  },
  payoff: {
    en: 'Linh has the banana! Thanks for the delivery, bạn. That is one good-neighbor rep completed; give those shoulders a break.',
    vi: 'Chị Linh nhận chuối rồi! Cảm ơn bạn giao giùm nha. Xong một hiệp hàng xóm tốt rồi đó; cho vai nghỉ chút đi.',
  },
}
