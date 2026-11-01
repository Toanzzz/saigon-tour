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
    en: 'Hoa got the broth without a spill, bạn? Score holds at nine-point-four. The chef and the judge agree.',
    vi: 'Cô Hoa nhận tô mà không đổ giọt nào hả bạn? Vậy giữ nguyên chín phẩy tư. Đầu bếp với giám khảo nhất trí.',
  },
}
