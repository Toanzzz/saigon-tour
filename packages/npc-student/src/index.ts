import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'walk',
  avatar: true,
}

export default defineResident({
  activities,
  id: 'student',
  name: { en: 'Minh', vi: 'Minh' },
  roles: { en: 'Student', vi: 'Sinh viên' },
  place: { en: 'the park', vi: 'công viên' },
  home: 'park',
  at: [20, -1],
  walk: [6, 0],
  look,
})
