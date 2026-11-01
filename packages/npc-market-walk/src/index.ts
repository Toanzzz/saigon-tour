import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'walk',
  avatar: true,
}

export default defineResident({
  id: 'market-walk',
  name: { en: 'Dat', vi: 'Đạt' },
  roles: { en: 'Market courier', vi: 'Người giao hàng ở chợ' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-17, 5.5],
  walk: [5, 0],
  look,
})
