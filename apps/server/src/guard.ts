interface SessionBudget {
  calls: number
  lastCallAt: number
  expiresAt: number
}

export class CostGuard {
  private sessions = new Map<string, SessionBudget>()
  private globalCalls = 0

  constructor(
    private readonly sessionLimit: number,
    private readonly globalLimit: number
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
    if (
      this.globalCalls >= this.globalLimit ||
      session.calls >= this.sessionLimit ||
      (session.lastCallAt > 0 && now - session.lastCallAt < 400)
    )
      return false
    if (!this.sessions.has(sessionId) && this.sessions.size >= 2000)
      return false
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
