import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'walk',
  avatar: true,
}

export default defineResident({
  id: 'plaza-stroll',
  name: { en: 'Khai', vi: 'Khải' },
  roles: { en: 'Evening stroller', vi: 'Người dạo phố buổi tối' },
  place: { en: 'City Hall', vi: 'Tòa Thị Chính' },
  home: 'cityhall',
  at: [71, 23],
  walk: [0, 5],
  look,
})
