import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'female-a',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'emote-yes',
  avatar: true,
}

export default defineResident({
  id: 'plaza-friends',
  name: { en: 'Ha', vi: 'Hà' },
  roles: { en: 'Plaza neighbor', vi: 'Hàng xóm ở quảng trường' },
  place: { en: 'City Hall', vi: 'Tòa Thị Chính' },
  home: 'cityhall',
  at: [67, 3],
  look,
})
