import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'female-a',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'emote-yes',
  avatar: true,
}

export default defineResident({
  id: 'market-family',
  name: { en: 'Huong', vi: 'Chị Hương' },
  roles: { en: 'Family shopper', vi: 'Người đi chợ cùng gia đình' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-35, 3],
  look,
})
