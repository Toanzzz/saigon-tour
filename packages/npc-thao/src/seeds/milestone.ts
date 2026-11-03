import type { SeedQuest } from '@saigon/npc-kit'

/**
 * Thảo's evening-concert errand. A riddle hides step 0: the cathedral echo
 * where her melody lives. Then Son returns the bridge he kept for her. Earns
 * the sheet-music component for the concert at City Hall.
 */
export const milestone: SeedQuest = {
  scope: 'solo',
  milestone: 'evening-concert',
  gift: 'sheet-music',
  steps: [
    { type: 'GO_TO', locationId: 'cathedral' },
    { type: 'TALK_TO', npcId: 'son' },
  ],
  riddle: {
    text: {
      en: 'My melody lost its bridge where two red-brick towers trade an echo. Stand where the square answers, then find the postcard poet who kept my missing bars.',
      vi: 'Đoạn nhạc lạc nơi hai tháp gạch đỏ trao tiếng vọng. Đứng chỗ quảng trường đáp lại, rồi tìm người viết bưu thiếp đang giữ mấy nhịp thất lạc.',
    },
  },
  text: {
    en: {
      title: 'The missing bars of the concert',
      description:
        'Vy needs my sheet music for the evening concert, but the bridge is missing. Solve where the melody hides, then ask Son — he kept the bars I lost. A neighbor or a cyclo can whisper the answer.',
    },
    vi: {
      title: 'Mấy nhịp thất lạc của đêm nhạc',
      description:
        'Vy cần bản nhạc của mình cho đêm nhạc, mà đoạn cầu thì mất tiêu. Đoán xem giai điệu trốn ở đâu, rồi hỏi Sơn — nó giữ mấy nhịp mình làm rớt. Hàng xóm hay bác xích lô có thể mách nhỏ cho.',
    },
  },
  payoff: {
    en: 'Sơn helped find the missing bars, and the score is whole for Vy’s concert. Thank you! I can finally hear the bridge leading everyone home.',
    vi: 'Sơn giúp tìm được mấy ô nhịp thất lạc, bản nhạc đủ cho đêm diễn của Vy rồi. Cảm ơn bạn nha! Mình nghe được đoạn chuyển dẫn mọi người về cùng nhau rồi.',
  },
}
