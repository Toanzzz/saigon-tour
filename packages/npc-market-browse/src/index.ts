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
  id: 'market-browse',
  name: { en: 'Ngoc', vi: 'Ngọc' },
  roles: { en: 'Market regular', vi: 'Khách quen ở chợ' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-30, 5.5],
  yaw: Math.PI,
  look,
})
