import {
  applyPlayerEvents,
  type PlayerEvent,
  type ServerSocketMessage,
} from '@saigon/shared'
import { game, update } from '../state/game'

type SocketEvent = Exclude<PlayerEvent, { type: 'deliver' }>
type Batch = { sequence: number; events: SocketEvent[] }
let sequence = Date.now()
let inFlight: Batch | null = null
let httpBusy = false
const waiters = new Set<() => void>()

export function eventDiagnostics() {
  return {
    sequence,
    inFlight: inFlight?.sequence ?? null,
    pending: game.state.pending.length,
    httpBusy,
  }
}
export function resetEventSequence() {
  sequence = Math.max(Date.now(), sequence + 1)
  inFlight = null
  httpBusy = false
  for (const resolve of waiters) resolve()
  waiters.clear()
}
export function nextEventBatch(): Batch | null {
  if (httpBusy || inFlight) return null
  // Preserve event order: deliveries and everything after them wait for HTTP.
  const end = game.state.pending.findIndex((event) => event.type === 'deliver')
  const count = Math.min(16, end < 0 ? game.state.pending.length : end)
  if (!count) return null
  inFlight = {
    sequence: ++sequence,
    events: game.state.pending.slice(0, count) as SocketEvent[],
  }
  update({ pending: game.state.pending.slice(count) })
  return inFlight
}
export function currentEventBatch() {
  return inFlight
}
export function acknowledgeWorld(
  message: Extract<ServerSocketMessage, { type: 'world' }>
) {
  const newerSave = message.revision > game.state.serverRevision
  if (!newerSave && inFlight && message.sequence < inFlight.sequence) return
  if (!newerSave && !inFlight && message.sequence <= sequence) return
  if (inFlight && message.sequence >= inFlight.sequence) {
    inFlight = null
    for (const resolve of waiters) resolve()
    waiters.clear()
  }
  game.setState((state) =>
    message.revision < state.serverRevision
      ? state
      : {
          ...state,
          serverRevision: message.revision,
          world: applyPlayerEvents(message.world, [
            ...(inFlight?.events ?? []),
            ...state.pending,
          ]),
          quest: message.quest,
          completed: message.completed,
          reputation: message.reputation,
        }
  )
}
/** Pause socket flushing before reading the HTTP turn's events. */
export async function beginHttpTurn() {
  if (httpBusy) return false
  httpBusy = true
  if (!inFlight) return true
  return new Promise<boolean>((resolve) => {
    const done = () => {
      clearTimeout(timer)
      waiters.delete(done)
      if (inFlight) httpBusy = false
      resolve(!inFlight)
    }
    const timer = setTimeout(done, 5000)
    waiters.add(done)
  })
}
export function endHttpTurn() {
  httpBusy = false
}
