import type { SeedQuest } from '@saigon/npc-kit'

/** Trang's running gag: a decimal score and tasting note for every bite. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'broth', npcId: 'hoa' }],
  text: {
    en: {
      title: 'A nine-point-four broth',
      description:
        'I scored this broth a nine-point-four, bạn: rich opening, strong finish. Take it to cô Hoa at the market so the judge can meet the chef — carefully, a spill drops it to a nine-point-one.',
    },
    vi: {
      title: 'Tô nước lèo chín phẩy tư',
      description:
        'Mình chấm tô nước lèo này chín phẩy tư nè bạn: mở vị đậm, hậu mạnh. Mang qua cho cô Hoa ở chợ để giám khảo gặp đầu bếp — nhẹ tay thôi, đổ một giọt là rớt còn chín phẩy một.',
    },
  },
  payoff: {
    en: 'Cô Hoa has the broth! Thank you, bạn. Nine-point-four for the recipe, ten for helping the judge reach the chef.',
    vi: 'Cô Hoa nhận nước lèo rồi! Cảm ơn bạn nha. Chín phẩy tư cho công thức, mười điểm cho người nối giám khảo với đầu bếp.',
  },
}
