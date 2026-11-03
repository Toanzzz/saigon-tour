import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Hoa's arc: a three-bowl errand. Peek down the alley, check with Mai, then
 * carry broth to Linh — until Mai reveals Linh's lunch moved to Vy's starving
 * lantern crew, so the broth lands there instead.
 */
export const arc: SeedQuest = {
  scope: 'solo',
  steps: [
    { type: 'GO_TO', locationId: 'alley' },
    { type: 'TALK_TO', npcId: 'mai' },
    { type: 'DELIVER', itemId: 'broth', npcId: 'linh' },
  ],
  text: {
    en: {
      title: 'A three-bowl delivery, con',
      description:
        'A three-bowl problem, con: duck into the alley, ask Mai where lunch landed, then rush this broth to Linh in the park while it is still a three-bowl broth.',
    },
    vi: {
      title: 'Chuyện giao cỡ ba tô, con',
      description:
        'Chuyện cỡ ba tô đó con: ghé vô hẻm, hỏi Mai bữa trưa dời đi đâu, rồi mang tô nước lèo này ra công viên cho chị Linh khi còn nóng cỡ ba tô.',
    },
  },
  twist: {
    step: { type: 'DELIVER', itemId: 'broth', npcId: 'vy' },
    line: {
      en: 'Mai: Linh\u2019s lunch moved to Vy\u2019s lantern crew — they are starving over there. Take the broth to Vy instead.',
      vi: 'Mai: bữa trưa của chị Linh dời qua nhóm làm lồng đèn của Vy rồi — tụi nó đói lả bên đó. Mang nước lèo qua cho Vy đi.',
    },
  },
  payoff: {
    en: 'The lantern crew has their broth! Thank you, con. A three-bowl problem, solved in one kind delivery.',
    vi: 'Nhóm lồng đèn có nước lèo rồi! Cảm ơn con nha. Chuyện cỡ ba tô, một chuyến giao dễ thương là xong.',
  },
}
