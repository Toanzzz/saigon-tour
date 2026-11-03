import type { AvatarBody } from '@saigon/shared'
import { npcPosition } from '@/shared/api/city'
import { audio } from '@/shared/audio'
import { motion } from '@/shared/runtime/motion'
import { restart, start } from './actions'
import { commitProfile } from './title-identity'

export async function startDemo(name: string, body: AvatarBody) {
  void audio.unlock()
  if (!(await restart())) return false
  if (!(await commitProfile(name, body))) return false
  const position = npcPosition('hoa')
  motion.teleport = [position[0], position[2] + 3]
  start()
  return true
}
