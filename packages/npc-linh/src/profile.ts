import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: 1,
  names: { en: 'Linh', vi: 'Chị Linh' },
  text: {
    en: {
      role: 'Student and neighborhood volunteer',
      knowledge: [
        'Ms. Hoa sends fresh herbs for the community lunch.',
        'The cathedral is nearby.',
      ],
    },
    vi: {
      role: 'Sinh viên và tình nguyện viên khu phố',
      knowledge: [
        'Cô Hoa gửi rau thơm cho bữa trưa chung.',
        'Nhà thờ ở gần đây.',
      ],
    },
  },
  personality: 'Curious, kind, cares about the community',
  speakingStyle: 'Bright, welcoming, conversational',
  home: 'park',
}
