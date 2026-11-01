import { defineNpc } from '@saigon/npc-kit'
import { look } from './look'
import { place } from './place'
import { profile } from './profile'
import { story } from './story'

export default defineNpc({
  id: 'plaza-stroll',
  profile,
  story,
  unlocks: [],
  look,
  place,
})
