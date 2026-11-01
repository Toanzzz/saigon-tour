import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'female-b',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'sit',
  avatar: true,
}

export default defineResident({
  id: 'coffee-reader',
  name: { en: 'Quynh', vi: 'Quỳnh' },
  roles: { en: 'Café reader', vi: 'Người đọc sách ở quán cà phê' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  friendliness: -1,
  at: [-14, 28],
  look,
})
