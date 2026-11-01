import type { SeedQuest } from '@saigon/npc-kit'

/** Mai talks about coffee like a sommelier with elaborate tasting notes. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'hoa' }],
  text: {
    en: {
      title: 'Tasting notes: caramel, rain, ambition',
      description:
        'Carry this cà phê sữa đá to Cô Hoa. Tasting notes: caramel, a hint of afternoon rain, and quiet ambition. Do not shake the ambition out.',
    },
    vi: {
      title: 'Hương vị: caramel, mưa, hoài bão',
      description:
        'Mang ly cà phê sữa đá này tới Cô Hoa. Hương vị: caramel, chút mưa chiều, và một ít hoài bão lặng lẽ. Đừng lắc rớt hoài bão nha.',
    },
  },
  payoff: {
    en: 'Hoa said it tastes like coffee? Finally, an honest review. Five stars.',
    vi: 'Cô Hoa bảo nó có vị cà phê hả? Cuối cùng cũng có một đánh giá thành thật. Năm sao.',
  },
}
