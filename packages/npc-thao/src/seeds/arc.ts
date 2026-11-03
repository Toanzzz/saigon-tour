import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Thao's arc: tracking a mysterious echo. Go to the cathedral square, ask Son
 * about the sound, then find Vy — until Son reveals the echo was Linh's
 * megaphone practice, so the player is sent to Linh instead.
 */
export const arc: SeedQuest = {
  scope: 'solo',
  steps: [
    { type: 'GO_TO', locationId: 'cathedral' },
    { type: 'TALK_TO', npcId: 'son' },
    { type: 'TALK_TO', npcId: 'vy' },
  ],
  text: {
    en: {
      title: 'The echo across the square',
      description:
        'I hear a melody in the square and I must find its source. Go to the cathedral, ask Son what he heard, then find Vy — her lanterns might be humming.',
    },
    vi: {
      title: 'Tiếng vọng qua quảng trường',
      description:
        'Mình nghe một giai điệu vang trong quảng trường và phải tìm cho ra nguồn. Ra nhà thờ, hỏi Sơn nghe được gì, rồi tìm Vy — biết đâu mấy chiếc lồng đèn của bạn ấy đang ngân nga.',
    },
  },
  twist: {
    step: { type: 'TALK_TO', npcId: 'linh' },
    line: {
      en: 'Son: that was no lantern. The echo was Linh practicing with her megaphone. Go ask her.',
      vi: 'Sơn: lồng đèn gì đâu. Tiếng vọng đó là Linh tập loa phóng thanh đó. Qua hỏi chị ấy đi.',
    },
  },
  payoff: {
    en: 'So the melody came from Linh and her megaphone! Thank you for following that echo. My city song has its very surprising chorus now.',
    vi: 'Thì ra giai điệu từ chị Linh với cái loa phóng thanh! Cảm ơn bạn lần theo tiếng vọng nha. Bài hát thành phố có điệp khúc bất ngờ quá chừng.',
  },
}
