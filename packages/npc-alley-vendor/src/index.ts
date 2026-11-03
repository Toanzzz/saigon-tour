import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'interact-right',
  yaw: Math.PI,
  avatar: true,
}

export default defineResident({
  activities,
  id: 'alley-vendor',
  completion: {
    en: 'Thank you, bạn. A helping hand keeps more than the stove warm. Stop by the alley again.',
    vi: 'Cảm ơn bạn nha. Có người giúp một tay thì đâu chỉ cái bếp ấm lên. Bữa nào ghé hẻm chơi nữa nhé.',
  },
  helloPayoff: {
    en: 'Linh got my hello! Thanks, bạn. The stove keeps me here, but a good neighbor can carry a little warmth all the way to the park.',
    vi: 'Chị Linh nhận lời chào rồi! Cảm ơn bạn nha. Chú vướng cái bếp ở đây, may có hàng xóm mang giùm chút ấm ra tận công viên.',
  },
  name: { en: 'Mr. Loc', vi: 'Chú Lộc' },
  roles: { en: 'Alley cook', vi: 'Người nấu ăn trong hẻm' },
  place: { en: 'the food alley', vi: 'hẻm ẩm thực' },
  home: 'alley',
  at: [-29, 33],
  yaw: Math.PI,
  look,
})
