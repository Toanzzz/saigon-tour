import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Linh's arc: a lunch committee errand. Visit the market, recruit Hoa, then
 * hand the invite postcard to Mai — until Hoa explains Mai is the guest list
 * herself, so the postcard goes to Thao, who runs entertainment.
 */
export const arc: SeedQuest = {
  scope: 'solo',
  steps: [
    { type: 'GO_TO', locationId: 'market' },
    { type: 'TALK_TO', npcId: 'hoa' },
    { type: 'DELIVER', itemId: 'postcard', npcId: 'mai' },
  ],
  text: {
    en: {
      title: 'Deputy Invitations Officer',
      description:
        'I am appointing you Deputy Invitations Officer. Report to the market, recruit Cô Hoa to the committee, then deliver this invitation postcard to Mai for the neighborhood lunch.',
    },
    vi: {
      title: 'Phó ban Thư mời',
      description:
        'Chị phong em làm Phó ban Thư mời. Ra chợ, mời Cô Hoa vào ban tổ chức, rồi mang tấm bưu thiếp mời này giao cho Mai cho bữa trưa của xóm nghen.',
    },
  },
  twist: {
    step: { type: 'DELIVER', itemId: 'postcard', npcId: 'thao' },
    line: {
      en: 'Hoa: Mai is not on the guest list — she is the guest list. Give the invite to Thao; she runs entertainment.',
      vi: 'Hoa: Mai đâu nằm trong danh sách khách — Mai chính là danh sách khách đó. Đưa thư mời cho Thảo đi, Thảo lo văn nghệ.',
    },
  },
  payoff: {
    en: 'Thảo has the invitation! Thank you. You are officially Head of Invitations; this neighborhood lunch has its entertainment now.',
    vi: 'Thảo nhận thư mời rồi! Cảm ơn bạn nha. Chính thức thăng làm Trưởng ban Thư mời luôn; bữa trưa xóm mình có văn nghệ rồi.',
  },
}
