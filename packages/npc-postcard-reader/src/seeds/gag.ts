import type { SeedQuest } from '@saigon/npc-kit'

/** Bảo's running gag: a stamp haiku rides along with every postcard. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'postcard', npcId: 'son' }],
  text: {
    en: {
      title: 'A haiku for the stamp',
      description:
        'I inked a haiku beside the stamp, bạn: blue stamp, patient glue / a small boat waits for the tide / carry it to shore. Take the postcard to anh Sơn at the post office.',
    },
    vi: {
      title: 'Bài haiku cho con tem',
      description:
        'Mình đề một bài haiku cạnh con tem, bạn ơi: tem xanh, keo kiên nhẫn / con thuyền nhỏ đợi con nước lên / mang tới bến giùm. Đưa tấm bưu thiếp cho anh Sơn ở bưu điện nhé.',
    },
  },
  payoff: {
    en: 'Sơn read the haiku aloud, bạn? Then the little boat reached shore. The stamp may retire, satisfied.',
    vi: 'Anh Sơn đọc bài haiku lên hả bạn? Vậy là con thuyền nhỏ đã tới bến. Con tem giờ có thể an lòng nghỉ hưu.',
  },
}
