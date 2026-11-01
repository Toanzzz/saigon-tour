import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'male-b',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'sit',
  yaw: Math.PI / 2,
  avatar: true,
}

export default defineResident({
  id: 'park-reader',
  name: { en: 'Mr. Phuc', vi: 'Chú Phúc' },
  roles: { en: 'Park reader', vi: 'Người đọc sách ở công viên' },
  place: { en: 'the park', vi: 'công viên' },
  home: 'park',
  friendliness: -1,
  at: [20, -12],
  yaw: Math.PI / 2,
  look,
})
