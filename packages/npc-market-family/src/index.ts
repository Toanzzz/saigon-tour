import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'emote-yes',
  avatar: true,
}

export default defineResident({
  activities,
  id: 'market-family',
  name: { en: 'Huong', vi: 'Chị Hương' },
  roles: { en: 'Family shopper', vi: 'Người đi chợ cùng gia đình' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-35, 3],
  look,
})
