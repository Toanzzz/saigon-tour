import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'idle',
  yaw: Math.PI,
  avatar: true,
}

export default defineResident({
  id: 'riverside-friends',
  name: { en: 'Nhi', vi: 'Nhi' },
  roles: { en: 'River neighbor', vi: 'Hàng xóm bên sông' },
  place: { en: 'the riverside', vi: 'bờ sông' },
  home: 'river',
  at: [42, 35],
  yaw: Math.PI,
  look,
})
