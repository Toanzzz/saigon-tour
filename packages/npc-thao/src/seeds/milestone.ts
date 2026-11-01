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
      vi: 'Khúc nhạc của mình rớt mất đoạn cầu nơi hai tháp gạch đỏ trao nhau tiếng vọng. Đứng chỗ quảng trường vọng lại, rồi tìm người viết bưu thiếp đang giữ mấy nhịp thất lạc của mình.',
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
    en: 'Son had the bridge as a postcard to the river. Now the sheet music is whole for the concert.',
    vi: 'Sơn giữ đoạn cầu trong một tấm bưu thiếp gửi dòng sông. Giờ bản nhạc đã nguyên vẹn cho đêm nhạc.',
  },
}
