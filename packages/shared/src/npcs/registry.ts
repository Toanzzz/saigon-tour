import hoa from '@saigon/npc-hoa'
import type { NpcDefinition } from '@saigon/npc-kit'
import type { NpcId } from '../entities'

/**
 * One definition per NPC. During the migration this mixes the first packaged
 * NPC with the data still living in shared tables; each extracted package
 * replaces its inline entry here. The `satisfies` guard fails the build if an
 * id is missing or unknown.
 */
export const NPC_REGISTRY = {
  hoa,
} satisfies Partial<Record<NpcId, NpcDefinition>>

export type RegisteredId = keyof typeof NPC_REGISTRY
