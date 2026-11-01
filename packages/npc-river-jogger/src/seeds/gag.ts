import type { SeedQuest } from '@saigon/npc-kit'

/** Long's running gag: gasped sentences and errands that must "keep pace". */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'banana', npcId: 'ba' }],
  text: {
    en: {
      title: 'Keep pace with the banana',
      description:
        'Quick — bạn — take this — banana — to bác Ba — by the river. But keep pace, do not — slow down, or it — counts as a — rest day. Go, go.',
    },
    vi: {
      title: 'Giữ nhịp với trái chuối',
      description:
        'Nhanh — bạn — mang — trái chuối — này cho — bác Ba — bên sông. Mà giữ nhịp, đừng — chậm lại, không thì — tính là — ngày nghỉ. Chạy, chạy.',
    },
  },
  payoff: {
    en: 'Bác Ba — got it — and you — kept pace? Then today — is not — a rest day. Huff — nice work, bạn.',
    vi: 'Bác Ba — nhận rồi — mà bạn — giữ nhịp hả? Vậy hôm nay — không phải — ngày nghỉ. Thở — giỏi lắm bạn.',
  },
}
