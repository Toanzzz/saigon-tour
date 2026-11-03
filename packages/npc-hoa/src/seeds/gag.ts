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
    en: 'Linh has her broth. Thank you, con! I called it a two-bowl problem; one kind neighbor did the trick.',
    vi: 'Chị Linh nhận nước lèo rồi. Cảm ơn con nha! Cô tưởng chuyện cỡ hai tô, ai dè có con giúp là xong.',
  },
}
