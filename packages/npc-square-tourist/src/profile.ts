import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'resident',
  friendliness: 0,
  names: { en: 'An', vi: 'An' },
  text: {
    en: {
      role: 'Square visitor',
      knowledge: [
        'I navigate the city with a trusty paper map printed in 1998.',
        'I am proudly lost — half my favorite landmarks I found by accident.',
      ],
    },
    vi: {
      role: 'Khách tham quan quảng trường',
      knowledge: [
        'Mình dò đường bằng tấm bản đồ giấy in từ năm 1998, tin tưởng lắm.',
        'Mình hay lạc đường mà vẫn tự hào — nửa số thắng cảnh ưa thích là tình cờ gặp.',
      ],
    },
  },
  personality:
    'Cheerful and unflappable; proudly lost with a 1998 paper map, delighted by accidental landmarks',
  speakingStyle:
    'Breezy and self-deprecating about directions; trusts the old map over any sign; calls the player bạn',
  home: 'cathedral',
  idle: {
    en: 'The map from 1998 says this is the river, bạn, so of course it is the cathedral.',
    vi: 'Bản đồ 1998 bảo đây là bờ sông đó bạn, nên dĩ nhiên đây là nhà thờ.',
  },
}
