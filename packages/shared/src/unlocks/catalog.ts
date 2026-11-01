import type { NeighborId } from '@saigon/npc-kit'

/** Neighbour ids that grant unlocks. */
export type UnlockGiver = NeighborId

/** Permanent reward slots a player can equip. One item per slot at a time. */
export const UNLOCK_SLOTS = [
  'hat',
  'outfit',
  'accessory',
  'vehicle',
  'pet',
] as const
export type UnlockSlot = (typeof UNLOCK_SLOTS)[number]

export const UNLOCK_KINDS = ['cosmetic', 'vehicle', 'pet'] as const
export type UnlockKind = (typeof UNLOCK_KINDS)[number]

/** Friendship tiers that gate which unlock a giver will promise. */
export type UnlockTier = 'neutral' | 'warm' | 'close'

export interface UnlockDef {
  id: string
  kind: UnlockKind
  slot: UnlockSlot
  giver: UnlockGiver
  tier: UnlockTier
  /** Runtime GLB path under the client public models root. Omitted for palette-only outfits. */
  model?: string
  /** Uniform scale applied when rendering the GLB. */
  scale?: number
  /** Walk speed when mounted. Vehicles only; always below the bus (10). */
  speed?: number
  /** Material recolours keyed by material name. Outfits only. */
  palette?: Record<string, string>
}
