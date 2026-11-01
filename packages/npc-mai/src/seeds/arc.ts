import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Mai's arc: a tasting-notes delivery. Grab a banana at the market, check with
 * Hoa, then bring the coffee to Hoa — until Hoa admits she is a pho person and
 * sends the cup to Son, who reviews everything.
 */
export const arc: SeedQuest = {
  scope: 'solo',
  steps: [
    { type: 'BUY', marketItemId: 'banana' },
    { type: 'TALK_TO', npcId: 'hoa' },
    { type: 'DELIVER', itemId: 'coffee', npcId: 'hoa' },
  ],
  text: {
    en: {
      title: 'Tasting notes: a palate cleanser',
      description:
        'First, a banana from the market as a palate cleanser. Then check in with Cô Hoa and hand her this cà phê sữa đá. Tasting notes: caramel, morning market, and a brave little bitterness.',
    },
    vi: {
      title: 'Hương vị: món súc miệng',
      description:
        'Trước hết, mua một trái chuối ngoài chợ để súc miệng cái đã. Rồi ghé Cô Hoa và đưa cô ly cà phê sữa đá này. Hương vị: caramel, chợ sớm, và một chút đắng gan lì.',
    },
  },
  twist: {
    step: { type: 'DELIVER', itemId: 'coffee', npcId: 'son' },
    line: {
      en: 'Hoa: con, I am a pho person, not a coffee person. Give it to Son — he reviews everything.',
      vi: 'Hoa: con ơi, cô là người của phở chớ đâu phải cà phê. Đưa cho Sơn đi — cái gì nó cũng chấm điểm hết.',
    },
  },
  payoff: {
    en: 'Son wrote tasting notes back? A postcard to a coffee? Finally, a reviewer with range.',
    vi: 'Sơn viết lại cảm nhận hả? Viết bưu thiếp cho ly cà phê luôn? Cuối cùng cũng gặp người sành điệu.',
  },
}
