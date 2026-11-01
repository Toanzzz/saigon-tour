import alex from '@saigon/npc-alex'
import ba from '@saigon/npc-ba'
import hoa from '@saigon/npc-hoa'
import type { NpcDefinition } from '@saigon/npc-kit'
import linh from '@saigon/npc-linh'
import mai from '@saigon/npc-mai'
import son from '@saigon/npc-son'
import tam from '@saigon/npc-tam'
import thao from '@saigon/npc-thao'
import vy from '@saigon/npc-vy'
import type { NpcId } from '../entities'

/**
 * One definition per NPC. During the migration this mixes extracted packages
 * with the data still living in shared tables; each extracted package replaces
 * its inline entry here. The `satisfies` guard fails the build if an id is
 * missing or unknown.
 */
export const NPC_REGISTRY = {
  hoa,
  tam,
  linh,
  ba,
  mai,
  alex,
  vy,
  son,
  thao,
} satisfies Partial<Record<NpcId, NpcDefinition>>

export type RegisteredId = keyof typeof NPC_REGISTRY
