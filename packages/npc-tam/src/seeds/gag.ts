import type { SeedQuest } from '@saigon/npc-kit'

/** Tâm times every trip in songs and swears his shortcuts are faster. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'hoa' }],
  text: {
    en: {
      title: 'The two-song shortcut',
      description:
        'Run this cà phê to Cô Hoa by my shortcut. It is exactly two songs long. Three if you hum slowly, which you will.',
    },
    vi: {
      title: 'Đường tắt hai bài hát',
      description:
        'Mang ly cà phê này tới Cô Hoa theo đường tắt của anh. Đúng hai bài hát thôi. Ba bài nếu em ngân nga chậm, mà chắc em sẽ vậy.',
    },
  },
  payoff: {
    en: 'Two songs, right? Do not tell me. I will tell everyone it was two songs.',
    vi: 'Hai bài hát đúng không? Đừng nói gì. Để anh khoe với mọi người là đúng hai bài.',
  },
}
