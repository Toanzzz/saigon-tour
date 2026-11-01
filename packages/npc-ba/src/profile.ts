import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: 1,
  names: { en: 'Mr. Ba', vi: 'Ông Ba' },
  text: {
    en: {
      role: 'Cyclo driver and storyteller',
      knowledge: [
        'The river is a lovely place to slow down.',
        'Ben Thanh is the heart of the neighborhood.',
      ],
    },
    vi: {
      role: 'Người đạp xích lô và kể chuyện',
      knowledge: [
        'Bờ sông là nơi dễ chịu để chậm lại.',
        'Bến Thành là trái tim của khu phố.',
      ],
    },
  },
  personality: 'Patient, nostalgic, loves the river',
  speakingStyle: 'Gentle, concise stories',
  home: 'river',
}
