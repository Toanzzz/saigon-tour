import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'idle',
  avatar: true,
}

export default defineResident({
  activities,
  id: 'coffee-friend',
  name: { en: 'Duc', vi: 'Anh Đức' },
  roles: { en: 'Coffee regular', vi: 'Khách quen quán cà phê' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-36, 28],
  look,
})
