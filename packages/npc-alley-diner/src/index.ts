import { defineNpc } from '@saigon/npc-kit'
import { activities } from './activities'
import { look } from './look'
import { place } from './place'
import { profile } from './profile'
import { story } from './story'

export default defineNpc({
  activities,
  id: 'alley-diner',
  profile,
  story,
  unlocks: [],
  look,
  place,
})
