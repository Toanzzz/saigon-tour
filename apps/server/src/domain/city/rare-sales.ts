import type { CityPlanBeat } from '@saigon/shared'

export const RARE_SALE_MS = 600_000
const GAP_MS = 3_600_000
const day = (at: number) => new Date(at).toISOString().slice(0, 10)

/** Server rules apply equally to model schedules, scripted beats and live actions. */
export class RareSales {
  private starts: number[] = []

  check(at: number) {
    const today = this.starts.filter((start) => day(start) === day(at))
    if (today.length >= 3) return 'rare_sale_daily_cap:3'
    if (this.starts.some((start) => Math.abs(at - start) < GAP_MS))
      return 'rare_sale_spacing:60_minutes'
    return null
  }

  record(at: number) {
    this.starts = this.starts.filter((start) => start > at - 86_400_000)
    this.starts.push(at)
  }

  validatePlan(beats: readonly CityPlanBeat[], now: number) {
    const starts = beats.flatMap((beat) =>
      beat.actions
        .filter((action) => action.type === 'start-rare-sale')
        .map(() => now + beat.atMinutes * 60_000)
    )
    if (starts.length > 3) return 'rare_sale_daily_cap:3'
    const counts = new Map<string, number>()
    for (const at of [...this.starts, ...starts]) {
      const key = day(at)
      const count = (counts.get(key) ?? 0) + 1
      if (count > 3) return 'rare_sale_daily_cap:3'
      counts.set(key, count)
    }
    starts.sort((a, b) => a - b)
    for (const [index, at] of starts.entries()) {
      const reason = this.check(at)
      if (reason) return reason
      if (index > 0 && at - starts[index - 1] < GAP_MS)
        return 'rare_sale_spacing:60_minutes'
    }
    return null
  }
}
