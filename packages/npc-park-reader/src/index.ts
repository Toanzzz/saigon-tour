import { defineResident, type NpcLook } from '@saigon/npc-kit'
import { activities } from './activities'

const look: NpcLook = {
  body: 'own',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'sit',
  yaw: Math.PI / 2,
  avatar: true,
}

export default defineResident({
  activities,
  id: 'park-reader',
  completion: {
    en: 'Thank you, bạn. Kindness is a good reason to put the book down for a moment. Sit here with me again.',
    vi: 'Cảm ơn bạn nha. Có người tử tế ghé qua thì gấp sách một lát cũng đáng. Bữa nào lại ngồi chơi với chú nhé.',
  },
  helloPayoff: {
    en: 'You gave Cô Hoa my hello. Thank you, bạn. A nice little story has made it from this bench all the way to the market.',
    vi: 'Bạn chào cô Hoa giùm chú rồi. Cảm ơn nha. Một chuyện dễ thương từ ghế đá này đi tới tận chợ rồi đó.',
  },
  name: { en: 'Mr. Phuc', vi: 'Chú Phúc' },
  roles: { en: 'Park reader', vi: 'Người đọc sách ở công viên' },
  place: { en: 'the park', vi: 'công viên' },
  home: 'park',
  friendliness: -1,
  at: [20, -12],
  yaw: Math.PI / 2,
  look,
})
