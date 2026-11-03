import type { SeedQuest } from '@saigon/npc-kit'

/** Bình's running gag: he grades every loaf in crunch decibels. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'baguette', npcId: 'tam' }],
  text: {
    en: {
      title: 'A ninety-decibel loaf',
      description:
        'This baguette just tested at ninety crunch decibels, bạn — a personal best. Carry it to chú Tâm at the market before the crust drops below eighty.',
    },
    vi: {
      title: 'Ổ bánh chín chục đề-xi-ben',
      description:
        'Ổ này vừa đo được chín chục đề-xi-ben độ giòn đó bạn — kỷ lục luôn. Mang qua cho chú Tâm ở chợ trước khi vỏ tụt xuống dưới tám chục.',
    },
  },
  payoff: {
    en: 'Tâm has his baguette! Thanks, bạn. Ninety crunch decibels have a witness now; I may need a bigger sign.',
    vi: 'Chú Tâm có bánh mì rồi! Cảm ơn bạn nha. Chín chục đề-xi-ben có nhân chứng luôn; chắc chú phải làm bảng hiệu lớn hơn quá.',
  },
}
