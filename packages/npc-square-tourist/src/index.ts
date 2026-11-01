import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'walk',
  avatar: true,
}

export default defineResident({
  id: 'square-tourist',
  name: { en: 'An', vi: 'An' },
  roles: { en: 'Square visitor', vi: 'Khách tham quan quảng trường' },
  place: { en: 'the cathedral square', vi: 'quảng trường nhà thờ' },
  home: 'cathedral',
  at: [84, -68],
  walk: [5, 0],
  look,
})
