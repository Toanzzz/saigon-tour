import type { PlayerEvent, WorldState } from './contracts'

export function applyPlayerEvents(
  input: WorldState,
  events: PlayerEvent[]
): WorldState {
  const world: WorldState = {
    ...input,
    inventory: { ...input.inventory },
    visitedLocations: [...input.visitedLocations],
    talkedTo: [...input.talkedTo],
    deliveredItems: [...input.deliveredItems],
    completedQuestIds: [...input.completedQuestIds],
  }
  for (const event of events) {
    if (event.type === 'visit') {
      world.locationId = event.locationId
      world.visitedLocations = [
        ...new Set([...world.visitedLocations, event.locationId]),
      ]
    } else if (event.type === 'talk') {
      world.talkedTo = [...new Set([...world.talkedTo, event.npcId])]
    } else if (event.type === 'spend') {
      world.currency = Math.max(0, world.currency - event.amount)
    } else {
      const held = world.inventory[event.itemId] ?? 0
      const key = `${event.itemId}:${event.npcId}`
      if (held > 0 && !world.deliveredItems.includes(key)) {
        world.inventory[event.itemId] = held - 1
        world.deliveredItems.push(key)
      }
    }
  }
  return world
}
