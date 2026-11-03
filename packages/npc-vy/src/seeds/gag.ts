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
    en: 'The coffee reached Mai for the lantern crew. Thank you! Phở Moon has its caffeine tribute; now we can keep the evening glowing.',
    vi: 'Cà phê tới chỗ Mai cho nhóm lồng đèn rồi. Cảm ơn bạn nha! Phở Moon có phần cà phê cổ vũ, tụi mình lại thắp sáng buổi tối tiếp.',
  },
}
