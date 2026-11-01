import type { SeedQuest } from '@saigon/npc-kit'

/** Vy names every lantern and gives each a dramatic backstory. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'mai' }],
  text: {
    en: {
      title: 'Coffee for the lantern crew',
      description:
        'Take this cà phê to Mai for the lantern crew. Tell her it is for "Phở Moon", the lantern that survived last year\'s drizzle. A hero deserves caffeine.',
    },
    vi: {
      title: 'Cà phê cho đội đèn lồng',
      description:
        'Mang ly cà phê này cho Mai cho đội làm đèn lồng. Nói với chị ấy là dành cho "Trăng Phở", chiếc đèn sống sót qua cơn mưa phùn năm ngoái. Anh hùng thì xứng đáng có cà phê.',
    },
  },
  payoff: {
    en: 'Mai toasted Phở Moon with the coffee. The lantern has never felt so seen.',
    vi: 'Mai nâng ly cà phê chúc mừng Trăng Phở. Chiếc đèn lồng chưa bao giờ thấy mình được công nhận đến vậy.',
  },
}
