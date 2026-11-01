import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Ba's evening-concert errand. A long leg to the opera, where Alex has been
 * borrowing Ba's lantern frames as props. Earns the lanterns component for the
 * concert at City Hall.
 */
export const milestone: SeedQuest = {
  scope: 'solo',
  milestone: 'evening-concert',
  gift: 'lanterns',
  steps: [
    { type: 'GO_TO', locationId: 'opera' },
    { type: 'TALK_TO', npcId: 'alex' },
  ],
  text: {
    en: {
      title: 'Lanterns borrowed for a backdrop',
      description:
        'Vy needs my lantern frames for the evening concert, and that reminds me of a story. Walk all the way to the opera, where Alex borrowed them as a backdrop, and ask for them back. The moral, as usual, is about something else.',
    },
    vi: {
      title: 'Khung đèn lồng cho tấm phông',
      description:
        'Vy cần mấy khung đèn lồng của ông cho đêm nhạc, mà nhắc tới là ông nhớ một câu chuyện. Đi một mạch qua nhà hát, chỗ Alex mượn làm phông chụp hình, rồi xin lại giùm. Bài học, như mọi khi, lại nói về chuyện khác.',
    },
  },
  payoff: {
    en: 'Alex returned the frames, still dressed for a photo. See, a lantern always comes home before the show.',
    vi: 'Alex trả lại mấy khung, còn nguyên dáng chụp hình. Thấy chưa, đèn lồng nào rồi cũng về kịp trước giờ diễn.',
  },
}
