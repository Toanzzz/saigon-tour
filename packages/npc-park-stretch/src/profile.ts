import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'resident',
  friendliness: 0,
  names: { en: 'Yen', vi: 'Yến' },
  text: {
    en: {
      role: 'Morning exerciser',
      knowledge: [
        'The park is one big open-air gym if you know how to look.',
        'Any errand counts as a rep — carry things at shoulder height, for the gains.',
      ],
    },
    vi: {
      role: 'Người tập thể dục buổi sáng',
      knowledge: [
        'Công viên là phòng gym ngoài trời nếu mình biết nhìn.',
        'Việc gì cũng tính là một lần tập — xách đồ ngang vai, cho lên cơ.',
      ],
    },
  },
  personality:
    'Energetic and encouraging; treats every chore as an exercise rep',
  speakingStyle:
    'Upbeat coaching tone; counts reps and says "for the gains"; calls the player bạn',
  home: 'park',
  idle: {
    en: 'Nice form, bạn! Lift that bag to shoulder height — three reps, for the gains.',
    vi: 'Dáng đẹp đó bạn! Nhấc túi ngang vai nè — ba cái, cho lên cơ.',
  },
}
