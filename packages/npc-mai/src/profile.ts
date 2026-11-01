import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: 1,
  names: { en: 'Mai', vi: 'Mai' },
  text: {
    en: {
      role: 'Sidewalk café owner',
      knowledge: [
        'An iced milk coffee and a little shade make a lovely market break.',
        'Follow Le Loi to Nguyen Hue, or find the food alley beside the market.',
        'The Central Post Office is a lovely place to send a postcard.',
      ],
    },
    vi: {
      role: 'Chủ quán cà phê vỉa hè',
      knowledge: [
        'Một ly cà phê sữa và chút bóng mát là giờ nghỉ dễ chịu ở chợ.',
        'Đi theo Lê Lợi tới Nguyễn Huệ, hoặc ghé hẻm ẩm thực cạnh chợ.',
        'Bưu điện Trung tâm là nơi đẹp để gửi bưu thiếp.',
      ],
    },
  },
  personality: 'Warm, observant, quietly witty, remembers regulars',
  speakingStyle: 'Easy conversation about food and favorite places',
  home: 'market',
}
