import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'male-a',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'walk',
  avatar: false,
}

export default defineResident({
  id: 'commuter',
  name: { en: 'Tuan', vi: 'Tuấn' },
  roles: { en: 'Commuter', vi: 'Người đi làm' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [1, 17.5],
  walk: [5, 0],
  phase: 2,
  look,
})
