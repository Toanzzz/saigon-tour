import type { SeedQuest } from '@saigon/npc-kit'

/** Linh organizes everything and hands out committee titles. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'hoa' }],
  text: {
    en: {
      title: 'Deputy Herb Logistics Officer',
      description:
        'I am appointing you Deputy Herb Logistics Officer. Your first duty: deliver these herbs to Cô Hoa at the market. Badge pending.',
    },
    vi: {
      title: 'Phó phòng Hậu cần Rau thơm',
      description:
        'Chị bổ nhiệm bạn làm Phó phòng Hậu cần Rau thơm. Nhiệm vụ đầu tiên: mang rau thơm này cho Cô Hoa ở chợ. Huy hiệu sẽ có sau.',
    },
  },
  payoff: {
    en: 'Flawless logistics. I am promoting you to Senior Deputy Herb Logistics Officer, effective immediately.',
    vi: 'Hậu cần hoàn hảo. Chị thăng chức bạn lên Phó phòng Cấp cao Hậu cần Rau thơm, có hiệu lực ngay.',
  },
}
