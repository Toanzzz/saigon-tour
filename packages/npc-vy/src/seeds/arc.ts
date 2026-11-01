import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Vy's arc: naming a new lantern. Hang it in the alley, let Hoa name it, then
 * mail the announcement postcard to Thao — until Hoa christens it "Pho Moon"
 * and Thao, a pun-hater, is swapped for Alex, who will photograph it.
 */
export const arc: SeedQuest = {
  scope: 'solo',
  steps: [
    { type: 'GO_TO', locationId: 'alley' },
    { type: 'TALK_TO', npcId: 'hoa' },
    { type: 'DELIVER', itemId: 'postcard', npcId: 'thao' },
  ],
  text: {
    en: {
      title: 'A lantern needs a name',
      description:
        'A new lantern needs a name and a dramatic backstory. Hang it in the alley, ask Cô Hoa for the name, then send the announcement postcard to Thao.',
    },
    vi: {
      title: 'Lồng đèn cần một cái tên',
      description:
        'Chiếc lồng đèn mới cần một cái tên và một câu chuyện thật kịch tính. Treo nó trong hẻm, nhờ Cô Hoa đặt tên, rồi gửi tấm bưu thiếp thông báo cho Thảo.',
    },
  },
  twist: {
    step: { type: 'DELIVER', itemId: 'postcard', npcId: 'alex' },
    line: {
      en: 'Hoa: I named it "Pho Moon." Thao hates puns, so send the card to Alex — he will photograph it.',
      vi: 'Hoa: cô đặt tên nó là "Phở Moon." Thảo ghét chơi chữ lắm, nên gửi tấm thiệp cho Alex đi — nó sẽ chụp hình cho.',
    },
  },
  payoff: {
    en: 'Alex photographed Pho Moon at dusk? A lantern with its own backstory and a portrait. Immortal.',
    vi: 'Alex chụp "Phở Moon" lúc chạng vạng hả? Một chiếc lồng đèn có cả câu chuyện lẫn tấm chân dung. Bất tử luôn.',
  },
}
