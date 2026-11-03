import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Vy's apex: bring all three earned components to City Hall and the evening
 * concert begins. BRING validates against MILESTONES; the player must already
 * hold lanterns, sheet music, and coffee beans.
 */
export const milestone: SeedQuest = {
  scope: 'solo',
  milestone: 'evening-concert',
  steps: [
    { type: 'BRING', itemId: 'lanterns', npcId: 'vy' },
    { type: 'BRING', itemId: 'sheet-music', npcId: 'vy' },
    { type: 'BRING', itemId: 'coffee-beans', npcId: 'vy' },
  ],
  text: {
    en: {
      title: 'The evening concert at City Hall',
      description:
        'You have the lanterns, the sheet music, and the beans. Bring all three to me at City Hall and we will light the square. I have already named the first lantern "Encore Moon."',
    },
    vi: {
      title: 'Đêm nhạc trước Ủy ban',
      description:
        'Bạn đã có đèn lồng, bản nhạc và cà phê. Mang cả ba tới cho mình trước Ủy ban, rồi tụi mình thắp sáng cả quảng trường. Mình đặt tên chiếc đèn đầu tiên là "Trăng Encore" rồi đó.',
    },
  },
  payoff: {
    en: 'Lanterns up, coffee ready, the melody whole again. Thank you for bringing us together! The square has its concert; Encore Moon shines for you too.',
    vi: 'Đèn lên, cà phê sẵn, giai điệu lại nguyên vẹn. Cảm ơn bạn đã nối mọi người với nhau! Đêm nhạc này là của cả xóm, Trăng Encore cũng sáng vì bạn nữa.',
  },
}
