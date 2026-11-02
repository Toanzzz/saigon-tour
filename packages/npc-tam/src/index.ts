import { defineNpc } from '@saigon/npc-kit'
import { activities } from './activities'
import { look } from './look'
import { place } from './place'
import { profile } from './profile'
import { story } from './story'
import { unlocks } from './unlocks'

export default defineNpc({
  activities,
  id: 'tam',
  profile,
  story,
  unlocks,
  look,
  place,
})
