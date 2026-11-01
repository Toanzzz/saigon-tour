import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'male-b',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'holding-both',
  yaw: Math.PI / 2,
  avatar: true,
}

export default defineResident({
  id: 'postcard-reader',
  name: { en: 'Bao', vi: 'Bảo' },
  roles: { en: 'Postcard reader', vi: 'Người đọc bưu thiếp' },
  place: { en: 'the Central Post Office', vi: 'Bưu điện Trung tâm' },
  home: 'postoffice',
  at: [98, -80],
  yaw: Math.PI / 2,
  look,
})
