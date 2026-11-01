import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'female-a',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'holding-both',
  avatar: false,
}

export default defineResident({
  id: 'fruit-vendor',
  name: { en: 'Ms. Hanh', vi: 'Cô Hạnh' },
  roles: { en: 'Fruit vendor', vi: 'Người bán trái cây' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-11, 2],
  look,
})
