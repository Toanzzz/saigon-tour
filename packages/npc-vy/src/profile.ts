import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: 1,
  names: { en: 'Vy', vi: 'Vy' },
  text: {
    en: {
      role: 'Lantern maker near City Hall',
      knowledge: [
        'The lanterns make Nguyen Hue glow after sunset.',
        'The food alley has a quiet corner where a missing lantern might turn up.',
        'The City Hall gardens are brightest when families gather for an evening walk.',
      ],
    },
    vi: {
      role: 'Người làm lồng đèn gần Tòa Thị Chính',
      knowledge: [
        'Lồng đèn làm phố Nguyễn Huệ sáng lên sau hoàng hôn.',
        'Hẻm ẩm thực có một góc yên tĩnh, có thể chiếc lồng đèn thất lạc ở đó.',
        'Vườn Tòa Thị Chính rực rỡ nhất khi các gia đình dạo tối.',
      ],
    },
  },
  personality: 'Patient, inventive, and quietly proud of the evening streets',
  speakingStyle: 'Gentle conversation with vivid details about light and color',
  home: 'cityhall',
}
