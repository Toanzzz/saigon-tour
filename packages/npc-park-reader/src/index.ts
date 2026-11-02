import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'sit',
  yaw: Math.PI / 2,
  avatar: true,
}

export default defineResident({
  activities,
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
