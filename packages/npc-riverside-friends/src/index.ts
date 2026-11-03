import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'idle',
  yaw: Math.PI,
  avatar: true,
}

export default defineResident({
  activities,
  id: 'riverside-friends',
  completion: {
    en: 'Thank you. It is nice to know the river is not the only thing connecting our corners of the city.',
    vi: 'Cảm ơn bạn nha. Vui ghê, nối mấy góc phố của mình đâu chỉ có dòng sông.',
  },
  helloPayoff: {
    en: 'You carried my hello to Linh! Thank you. It is good to have a little friendship running between the river and the park.',
    vi: 'Bạn mang lời chào tới chị Linh rồi! Cảm ơn nha. Có chút tình bạn nối bờ sông với công viên, vui ghê.',
  },
  name: { en: 'Nhi', vi: 'Nhi' },
  roles: { en: 'River neighbor', vi: 'Hàng xóm bên sông' },
  place: { en: 'the riverside', vi: 'bờ sông' },
  home: 'river',
  at: [42, 35],
  yaw: Math.PI,
  look,
})
