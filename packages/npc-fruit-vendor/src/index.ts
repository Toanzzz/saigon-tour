import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'holding-both',
  avatar: true,
}

export default defineResident({
  activities,
  id: 'fruit-vendor',
  name: { en: 'Ms. Hanh', vi: 'Cô Hạnh' },
  roles: { en: 'Fruit vendor', vi: 'Người bán trái cây' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [-11, 2],
  look,
})
