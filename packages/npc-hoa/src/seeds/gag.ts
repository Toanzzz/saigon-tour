import type { SeedQuest } from '@saigon/npc-kit'

/** Hoa's running gag: she measures every problem in bowls of broth. */
export const gag: SeedQuest = {
  scope: 'solo',
  demo: true,
  steps: [{ type: 'DELIVER', itemId: 'broth', npcId: 'linh' }],
  text: {
    en: {
      title: 'A two-bowl problem',
      description:
        'Chị Linh sounds like a two-bowl problem, con. Carry this broth to her in the park before it cools to a one-bowl mood.',
    },
    vi: {
      title: 'Chuyện cỡ hai tô',
      description:
        'Chị Linh nghe như chuyện cỡ hai tô đó con. Mang tô nước lèo này ra công viên cho chị ấy trước khi nguội còn cỡ một tô.',
    },
  },
  payoff: {
    en: 'Linh smiled? Good. I had her down as a two-bowl problem; turns out one bowl did it.',
    vi: 'Chị Linh cười hả? Tốt. Cô tưởng cỡ hai tô, ai dè một tô là xong.',
  },
}
