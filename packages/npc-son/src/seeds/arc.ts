import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Son's arc: a postcard addressed to a place. Walk to the river, ask Ba to read
 * it, then deliver the postcard to Mai — until Ba notes the river cannot read,
 * but Thao sings to it every evening, so Thao becomes the recipient.
 */
export const arc: SeedQuest = {
  scope: 'solo',
  steps: [
    { type: 'GO_TO', locationId: 'river' },
    { type: 'TALK_TO', npcId: 'ba' },
    { type: 'DELIVER', itemId: 'postcard', npcId: 'mai' },
  ],
  text: {
    en: {
      title: 'Dear River, you looked tired',
      description:
        'I wrote a postcard. It opens, "Dear River, you looked tired today." Walk to the river, ask Ong Ba to hear it out, then carry the postcard to Mai.',
    },
    vi: {
      title: 'Sông ơi, bữa nay trông mệt',
      description:
        'Mình viết một tấm bưu thiếp. Mở đầu là: "Sông ơi, bữa nay trông mệt quá." Ra bờ sông, nhờ Ông Ba nghe thử, rồi mang tấm thiếp tới cho Mai.',
    },
  },
  twist: {
    step: { type: 'DELIVER', itemId: 'postcard', npcId: 'thao' },
    line: {
      en: 'Ba: the river cannot read, you know. But Thao sings to it every evening — give the postcard to her.',
      vi: 'Ba: sông đâu biết đọc đâu con. Nhưng chiều nào Thảo cũng hát cho nó nghe — đưa tấm thiếp cho Thảo đi.',
    },
  },
  payoff: {
    en: 'Thao read it to the river as a song? Dear River, you have a voice now. Yours, Son.',
    vi: 'Thảo hát tấm thiếp cho dòng sông nghe hả? Sông ơi, giờ sông có giọng rồi đó. Thương, Sơn.',
  },
}
