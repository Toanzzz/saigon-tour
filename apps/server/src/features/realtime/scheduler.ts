import type { NeighborId } from '@saigon/shared'

export type WakeReason =
  | 'player-nearby'
  | 'quest-deadline'
  | 'world-event'
  | 'schedule'
export interface WakeRequest {
  npcId: NeighborId
  reason: WakeReason
}

/**
 * Event-driven NPC wake-ups. Nothing runs per frame: the game queues events,
 * and each tick wakes at most `budget` NPCs that are past their cooldown.
 */
export class NpcScheduler {
  private queue = new Map<NeighborId, WakeReason>()
  private lastWake = new Map<NeighborId, number>()
  private suppressed = false

  constructor(
    private readonly wake: (request: WakeRequest) => Promise<void>,
    private readonly cooldownMs = 120_000,
    private readonly budget = 3
  ) {}

  notify(npcId: NeighborId, reason: WakeReason) {
    this.queue.set(npcId, reason)
  }

  /** Pause autonomous updates during rides and loading. */
  suppress(value: boolean) {
    this.suppressed = value
  }

  async tick(now = Date.now()): Promise<WakeRequest[]> {
    if (this.suppressed) return []
    const due = [...this.queue]
      .filter(([id]) => now - (this.lastWake.get(id) ?? 0) >= this.cooldownMs)
      .slice(0, this.budget)
      .map(([npcId, reason]) => ({ npcId, reason }))
    for (const request of due) {
      this.queue.delete(request.npcId)
      this.lastWake.set(request.npcId, now)
      await this.wake(request)
    }
    return due
  }

  start(intervalMs = 30_000) {
    const timer = setInterval(() => void this.tick(), intervalMs)
    timer.unref?.()
    return () => clearInterval(timer)
  }
}
