import { defineNpc } from '@saigon/npc-kit'
import { look } from './look'
import { persona } from './persona'
import { place } from './place'
import { profile } from './profile'
import { story } from './story'
import { unlocks } from './unlocks'

export default defineNpc({
  id: 'hoa',
  profile,
  story,
  unlocks,
  look,
  place,
  persona,
})
