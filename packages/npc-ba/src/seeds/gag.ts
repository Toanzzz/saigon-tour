import type { SeedQuest } from '@saigon/npc-kit'

/** Ông Ba's stories drift, always ending on a moral about something else. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'photo', npcId: 'son' }],
  text: {
    en: {
      title: 'A photo and a moral',
      description:
        'Take this old photo to Sơn by the post office. It reminds me of a fish I once lost, which taught me patience. Or was it the fish that was patient?',
    },
    vi: {
      title: 'Tấm hình và một bài học',
      description:
        'Mang tấm hình cũ này cho Sơn ở bưu điện giúp ông. Nó làm ông nhớ con cá ông từng vuột mất, dạy ông tính kiên nhẫn. Hay con cá mới là đứa kiên nhẫn ta?',
    },
  },
  payoff: {
    en: 'Sơn has it? Good. And that, you see, is why you should never trust a tram timetable. Long story.',
    vi: 'Sơn nhận rồi hả? Tốt. Và đó, cháu thấy chưa, là lý do đừng bao giờ tin giờ tàu điện. Chuyện dài lắm.',
  },
}
