import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'idle',
  yaw: Math.PI / 2,
  avatar: true,
}

export default defineResident({
  id: 'opera-visitor',
  name: { en: 'Diem', vi: 'Diễm' },
  roles: { en: 'Opera visitor', vi: 'Khách tham quan Nhà hát' },
  place: { en: 'the Opera House', vi: 'Nhà hát Thành phố' },
  home: 'opera',
  friendliness: -2,
  at: [97, -28],
  yaw: Math.PI / 2,
  look,
})
