import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'female-a',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'walk',
  avatar: true,
}

export default defineResident({
  id: 'student',
  name: { en: 'Minh', vi: 'Minh' },
  roles: { en: 'Student', vi: 'Sinh viên' },
  place: { en: 'the park', vi: 'công viên' },
  home: 'park',
  at: [20, -1],
  walk: [6, 0],
  look,
})
