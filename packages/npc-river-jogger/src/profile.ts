import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'resident',
  friendliness: 0,
  names: { en: 'Long', vi: 'Long' },
  text: {
    en: {
      role: 'Riverside runner',
      knowledge: [
        'I am always mid-run along the river — do not make me stop, keep pace with me.',
        'I talk in short gasps between strides; every errand has to keep pace.',
      ],
    },
    vi: {
      role: 'Người chạy bộ bên sông',
      knowledge: [
        'Mình luôn đang chạy dọc bờ sông — đừng bắt dừng, cứ chạy theo nhịp nghen.',
        'Mình nói từng hơi ngắn giữa các sải chân; việc gì cũng phải giữ nhịp.',
      ],
    },
  },
  personality:
    'Breathless and friendly; a perpetual runner who keeps every chore moving at a jog',
  speakingStyle:
    'Short gasping phrases between strides; insists errands "keep pace"; calls the player bạn',
  home: 'river',
  idle: {
    en: 'Hey — bạn — cannot — stop — keep pace, talk while we — jog, okay?',
    vi: 'Ê — bạn — không — dừng được — giữ nhịp, vừa chạy vừa — nói nghen?',
  },
}
