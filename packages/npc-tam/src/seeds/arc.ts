import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Tâm's "Wedding cake express": the demo beat. His helmet is at the polisher,
 * so he cannot drive the cake himself. Talk to Mai, then deliver the cake —
 * but the wedding has moved to the riverside, so Ông Ba becomes the recipient.
 */
export const arc: SeedQuest = {
  scope: 'solo',
  steps: [
    { type: 'TALK_TO', npcId: 'mai' },
    { type: 'DELIVER', itemId: 'cake', npcId: 'mai' },
  ],
  text: {
    en: {
      title: 'Wedding cake express',
      description:
        'My helmet is at the polisher, so I cannot drive this wedding cake myself. Check in with Mai, then carry the cake to her — gently, it is three tiers of trust.',
    },
    vi: {
      title: 'Chuyển phát bánh cưới',
      description:
        'Nón bảo hiểm của anh đang ở tiệm đánh bóng, nên anh không tự chở bánh cưới này được. Ghé Mai một tiếng, rồi mang bánh tới cho chị ấy — nhẹ tay nghen, ba tầng niềm tin đó.',
    },
  },
  twist: {
    step: { type: 'DELIVER', itemId: 'cake', npcId: 'ba' },
    line: {
      en: 'Mai: the wedding moved to the riverside! Ông Ba is the chủ hôn now. Take the cake to him.',
      vi: 'Mai: đám cưới dời ra bờ sông rồi! Ông Ba làm chủ hôn giờ. Mang bánh ra cho ông đi.',
    },
  },
  payoff: {
    en: 'The cake reached Ông Ba for the riverside wedding! Thanks for carrying those three tiers of trust. I am telling everyone you were the express route.',
    vi: 'Bánh tới chỗ ông Ba cho đám cưới bên sông rồi! Cảm ơn em đã mang ba tầng tin tưởng nha. Để anh khoe em mới là đường tắt xịn nhất.',
  },
}
