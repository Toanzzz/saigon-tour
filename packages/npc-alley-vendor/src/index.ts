import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'male-b',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'interact-right',
  yaw: Math.PI,
  avatar: true,
}

export default defineResident({
  id: 'alley-vendor',
  name: { en: 'Mr. Loc', vi: 'Chú Lộc' },
  roles: { en: 'Alley cook', vi: 'Người nấu ăn trong hẻm' },
  place: { en: 'the food alley', vi: 'hẻm ẩm thực' },
  home: 'alley',
  at: [-29, 33],
  yaw: Math.PI,
  look,
})
