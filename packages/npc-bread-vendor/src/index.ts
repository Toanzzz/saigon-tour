import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'male-b',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'interact-right',
  avatar: false,
}

export default defineResident({
  id: 'bread-vendor',
  name: { en: 'Mr. Binh', vi: 'Chú Bình' },
  roles: { en: 'Sandwich vendor', vi: 'Người bán bánh mì' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-34, 2],
  look,
})
