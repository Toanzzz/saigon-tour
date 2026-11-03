import {
  type ItemId,
  isMilestoneFinale,
  MILESTONES,
  type MilestoneId,
  NPCS,
  type NpcId,
} from '@saigon/shared'
import { m, npcLabel } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
import { placeName } from '@/shared/world/places'

export interface MilestoneComponentView {
  itemId: ItemId
  giver: NpcId
  giverName: string
  place: string
  held: boolean
}
export interface MilestoneBoard {
  id: MilestoneId
  title: string
  components: MilestoneComponentView[]
  /** 'gather' while collecting, 'ready' once all held, 'done' once completed. */
  state: 'gather' | 'ready' | 'done'
  /** The next giver to visit, or null when ready or done. */
  nextGiver: NpcId | null
  host: NpcId
  hostName: string
}

/** The district milestone board, derived from inventory and completed[]. */
export function milestoneBoard(
  state: GameState,
  id: MilestoneId = 'evening-concert'
): MilestoneBoard {
  const milestone = MILESTONES[id]
  const done = state.completed.some(
    (quest) => quest.milestone === id && isMilestoneFinale(quest)
  )
  const components = milestone.components.map((component) => ({
    itemId: component.itemId,
    giver: component.giver,
    giverName: npcLabel(component.giver),
    place: placeName(NPCS[component.giver].location),
    held: (state.world.inventory[component.itemId] ?? 0) > 0,
  }))
  const allHeld = components.every((component) => component.held)
  const nextGiver = done
    ? null
    : (components.find((component) => !component.held)?.giver ?? null)
  return {
    id,
    title: m.milestone_concert_title(),
    components,
    state: done ? 'done' : allHeld ? 'ready' : 'gather',
    nextGiver,
    host: milestone.host,
    hostName: npcLabel(milestone.host),
  }
}
