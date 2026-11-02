import { log } from '@/shared'

interface SessionBudget {
  calls: number
  lastCallAt: number
  expiresAt: number
}

export class CostGuard {
  private sessions = new Map<string, SessionBudget>()
  private globalCalls = 0

  /**
   * `enforce=false` (local dev) never blocks on a quota: a call that would
   * exceed the per-session, global, or session-table limit is logged as a
   * warning and allowed through. The 400ms burst throttle is a provider-safety
   * debounce, not a quota, so it stays enforced in every mode. `label` names
   * the guard in the warning. Counters still advance so the warnings report
   * real usage.
   */
  constructor(
    private readonly sessionLimit: number,
    private readonly globalLimit: number,
    private readonly enforce = true,
    private readonly label = 'cost_guard'
  ) {}

  allow(sessionId: string, now = Date.now()): boolean {
    for (const [key, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(key)
    }
    const session = this.sessions.get(sessionId) ?? {
      calls: 0,
      lastCallAt: 0,
      expiresAt: now + 60 * 60 * 1000,
    }
    // Burst throttle is a safety debounce, never bypassed.
    if (session.lastCallAt > 0 && now - session.lastCallAt < 400) return false
    const quota =
      this.globalCalls >= this.globalLimit
        ? `global call limit reached: ${this.globalCalls}/${this.globalLimit} calls`
        : session.calls >= this.sessionLimit
          ? `session call limit reached for ${sessionId}: ${session.calls}/${this.sessionLimit} calls`
          : !this.sessions.has(sessionId) && this.sessions.size >= 2000
            ? `session table full: ${this.sessions.size}/2000 sessions`
            : null
    if (quota) {
      if (this.enforce) return false
      log(
        `${this.label}_bypassed`,
        `local dev: ${quota}; global so far ${this.globalCalls}/${this.globalLimit}; allowing instead of enforcing`,
        'warn'
      )
    }
    session.calls += 1
    session.lastCallAt = now
    this.globalCalls += 1
    this.sessions.set(sessionId, session)
    return true
  }
}

export class BoundedCache<T> {
  private values = new Map<string, { value: T; expiresAt: number }>()

  constructor(
    private readonly capacity = 256,
    private readonly ttlMs = 5 * 60 * 1000
  ) {}

  get(key: string): T | undefined {
    const entry = this.values.get(key)
    if (!entry) return undefined
    if (entry.expiresAt < Date.now()) {
      this.values.delete(key)
      return undefined
    }
    return structuredClone(entry.value)
  }

  set(key: string, value: T): void {
    if (this.values.size >= this.capacity) {
      const first = this.values.keys().next().value
      if (first !== undefined) this.values.delete(first)
    }
    this.values.set(key, {
      value: structuredClone(value),
      expiresAt: Date.now() + this.ttlMs,
    })
  }
}
