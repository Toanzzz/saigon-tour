import type { SeedQuest } from '@saigon/npc-kit'

/** An's running gag: the 1998 map is always a little wrong, so landmarks arrive by accident. */
export const gag: SeedQuest = {
  scope: 'solo',
  steps: [{ type: 'DELIVER', itemId: 'postcard', npcId: 'vy' }],
  text: {
    en: {
      title: 'Where the map says the river is',
      description:
        'My 1998 map swears the river is this way, bạn, which means it is actually City Hall. Take this postcard to chị Vy there — if you reach water, we are both lost.',
    },
    vi: {
      title: 'Chỗ bản đồ ghi là bờ sông',
      description:
        'Bản đồ 1998 của mình thề đây là hướng bờ sông, bạn ơi, nghĩa là thật ra là Tòa Thị Chính. Mang tấm bưu thiếp này cho chị Vy ở đó — nếu bạn ra tới mé nước thì cả hai cùng lạc.',
    },
  },
  payoff: {
    en: 'You found Vy at City Hall, not the river? See, the 1998 map is never wrong — it just rounds up.',
    vi: 'Bạn gặp chị Vy ở Tòa Thị Chính chứ không phải bờ sông hả? Thấy chưa, bản đồ 1998 không sai bao giờ — nó chỉ làm tròn thôi.',
  },
}
