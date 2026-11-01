import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'male-a',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'walk',
  avatar: false,
}

export default defineResident({
  id: 'river-jogger',
  name: { en: 'Long', vi: 'Long' },
  roles: { en: 'Riverside runner', vi: 'Người chạy bộ bên sông' },
  place: { en: 'the riverside', vi: 'bờ sông' },
  home: 'river',
  at: [61, 34.8],
  walk: [6, 0],
  phase: 1,
  look,
})
