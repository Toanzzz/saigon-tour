import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Ba's arc: an old photo and a drifting story. Visit the opera, let Alex frame
 * it, then take the photo to Son — until Alex recognizes the man in the picture
 * as Tam's grandfather, so the photo goes home to Tam.
 */
export const arc: SeedQuest = {
  scope: 'solo',
  steps: [
    { type: 'GO_TO', locationId: 'opera' },
    { type: 'TALK_TO', npcId: 'alex' },
    { type: 'DELIVER', itemId: 'photo', npcId: 'son' },
  ],
  text: {
    en: {
      title: 'The photo that wandered',
      description:
        'This old photo has a story, and the story drifts. Walk to the opera, let Alex look it over, then carry the photo to Son. The moral, as always, is about something else.',
    },
    vi: {
      title: 'Tấm hình đi lạc',
      description:
        'Tấm hình cũ này có một câu chuyện, mà chuyện thì cứ lan man. Ra nhà hát, nhờ Alex ngó qua, rồi mang tấm hình tới cho Sơn. Bài học, như mọi khi, lại nói về chuyện khác.',
    },
  },
  twist: {
    step: { type: 'DELIVER', itemId: 'photo', npcId: 'tam' },
    line: {
      en: 'Alex: the man in this old photo is Tam\u2019s grandfather. Forget Son — this belongs with Tam.',
      vi: 'Alex: người đàn ông trong tấm hình cũ này là ông nội của Tâm đó. Khỏi đưa Sơn — tấm này phải về với Tâm.',
    },
  },
  payoff: {
    en: 'Tam teared up? See, that is the moral: a photo always finds its way home, like my stories find the point.',
    vi: 'Tâm rưng rưng hả? Thấy chưa, đó là bài học: tấm hình nào rồi cũng tìm đường về nhà, như chuyện của ông rồi cũng tới chỗ cần tới.',
  },
}
