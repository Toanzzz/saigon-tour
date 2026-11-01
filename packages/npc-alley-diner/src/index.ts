import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'female-a',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'sit',
  avatar: true,
}

export default defineResident({
  id: 'alley-diner',
  name: { en: 'Trang', vi: 'Trang' },
  roles: { en: 'Food enthusiast', vi: 'Người mê ẩm thực' },
  place: { en: 'the food alley', vi: 'hẻm ẩm thực' },
  home: 'alley',
  at: [-23, 31],
  look,
})
