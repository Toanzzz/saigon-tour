import type { WorldState } from './contracts'
import type { ItemId, LocationId, MilestoneId, NpcId } from './entities'
import type { Locale } from './locale'

export type { MilestoneId }

type Text = Record<Locale, string>

export interface MilestoneComponent {
  itemId: ItemId
  giver: NpcId
}

export interface Milestone {
  host: NpcId
  locationId: LocationId
  components: MilestoneComponent[]
  event: {
    kind: string
    title: Text
    description: Text
    durationMs: number
  }
}

/** The evening concert: three parallel components brought to Vy at City Hall. */
export const MILESTONES: Record<MilestoneId, Milestone> = {
  'evening-concert': {
    host: 'vy',
    locationId: 'cityhall',
    components: [
      { itemId: 'coffee-beans', giver: 'mai' },
      { itemId: 'sheet-music', giver: 'thao' },
      { itemId: 'lanterns', giver: 'ba' },
    ],
    event: {
      kind: 'street-music',
      title: {
        en: 'Evening concert at City Hall',
        vi: 'Đêm nhạc trước Ủy ban',
      },
      description: {
        en: 'Lanterns, beans, and a lost melody meet for a concert on the square.',
        vi: 'Đèn lồng, cà phê và một khúc nhạc thất lạc hội tụ thành đêm nhạc trước quảng trường.',
      },
      durationMs: 180_000,
    },
  },
}

/** Every item that is a milestone component; kept out of DELIVER and BUY steps. */
export const COMPONENT_ITEM_IDS: ItemId[] = Object.values(MILESTONES).flatMap(
  (milestone) => milestone.components.map((component) => component.itemId)
)

/** Components the player currently holds for a milestone. */
export function heldComponents(world: WorldState, id: MilestoneId): ItemId[] {
  return MILESTONES[id].components
    .map((component) => component.itemId)
    .filter((itemId) => (world.inventory[itemId] ?? 0) > 0)
}

/** True once the player holds every component of a milestone. */
export function milestoneReady(world: WorldState, id: MilestoneId): boolean {
  return heldComponents(world, id).length === MILESTONES[id].components.length
}

/** The milestone a giver supplies a component for, if any. */
export function milestoneForGiver(npcId: NpcId): MilestoneId | null {
  for (const [id, milestone] of Object.entries(MILESTONES) as [
    MilestoneId,
    Milestone,
  ][])
    if (milestone.components.some((component) => component.giver === npcId))
      return id
  return null
}
