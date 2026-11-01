import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'female-b',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'emote-yes',
  avatar: false,
}

export default defineResident({
  id: 'park-stretch',
  name: { en: 'Yen', vi: 'Yến' },
  roles: { en: 'Morning exerciser', vi: 'Người tập thể dục buổi sáng' },
  place: { en: 'the park', vi: 'công viên' },
  home: 'park',
  at: [34, -5.8],
  look,
})
