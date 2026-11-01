import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: 1,
  names: { en: 'Son', vi: 'Sơn' },
  text: {
    en: {
      role: 'Postcard collector',
      knowledge: [
        'The Central Post Office square is a perfect place to start a city story.',
        'A river view gives every postcard a little more sky.',
        'Old postcards connect the market, the landmarks, and the people between them.',
      ],
    },
    vi: {
      role: 'Người sưu tầm bưu thiếp',
      knowledge: [
        'Quảng trường Bưu điện Trung tâm là nơi hợp để bắt đầu một câu chuyện thành phố.',
        'Cảnh sông cho mỗi tấm bưu thiếp thêm chút bầu trời.',
        'Bưu thiếp cũ nối chợ, các công trình và những con người ở giữa.',
      ],
    },
  },
  personality: 'Curious, sentimental, and always looking for a new view',
  speakingStyle: 'Thoughtful observations with a collector’s excitement',
  home: 'postoffice',
}
