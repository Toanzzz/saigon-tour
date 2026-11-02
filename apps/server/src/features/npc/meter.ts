import { log } from '@/shared'
import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'
import {
  type ModelTiming,
  modelTiming,
  observeModelStream,
} from './model-timing'

export interface HarnessUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  estimatedUsd: number
  lastCall?: ModelTiming
}

export class BudgetExceeded extends Error {}
export class StorageUnavailable extends Error {}
export function storageUnavailable(error: unknown, depth = 0): boolean {
  if (error instanceof StorageUnavailable) return true
  if (!error || typeof error !== 'object' || depth > 8) return false
  return ['cause', 'error', 'errors'].some((key) => {
    const value = (error as Record<string, unknown>)[key]
    return Array.isArray(value)
      ? value.some((item) => storageUnavailable(item, depth + 1))
      : storageUnavailable(value, depth + 1)
  })
}

/**
 * Collapse a thrown value (and its nested cause/error chain) into a single
 * compact line for the failure log, so a swallowed NPC turn error is
 * debuggable without a stack trace. Dedupes repeated messages and includes any
 * HTTP status / response body the provider attached.
 */
export function describeError(error: unknown, attempt?: number): string {
  const parts: string[] = []
  if (typeof attempt === 'number') parts.push(`attempt=${attempt + 1}`)
  const seen = new Set<string>()
  let current: unknown = error
  for (let depth = 0; current && depth <= 8; depth++) {
    const piece = errorPiece(current)
    if (piece && !seen.has(piece)) {
      seen.add(piece)
      parts.push(piece)
    }
    current =
      current && typeof current === 'object'
        ? ((current as Record<string, unknown>).cause ??
          (current as Record<string, unknown>).error)
        : undefined
  }
  if (parts.length <= (typeof attempt === 'number' ? 1 : 0))
    parts.push(`error=${safeStringify(error)}`)
  return parts.join(' ')
}

function errorPiece(value: unknown): string | null {
  if (value instanceof Error) {
    const extra = value as Error & {
      name?: string
      statusCode?: number
      status?: number
      responseBody?: unknown
      data?: unknown
    }
    const bits = [`${extra.name ?? 'Error'}: ${extra.message}`]
    const status = extra.statusCode ?? extra.status
    if (status != null) bits.push(`status=${status}`)
    const body = extra.responseBody ?? extra.data
    if (body != null) bits.push(`body=${safeStringify(body)}`)
    return bits.join(' ')
  }
  if (typeof value === 'string') return value
  return null
}

function safeStringify(value: unknown): string {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    if (!text) return String(value)
    return text.length > 500 ? `${text.slice(0, 500)}…` : text
  } catch {
    return String(value)
  }
}

/** Reserve every HTTP model step, including retries, before calling the provider. */
export function meteredFetch(
  db: GameDb,
  fetcher: Fetcher,
  limit: number,
  usage: HarnessUsage,
  bark = false,
  enforce = true
): Fetcher {
  return async (input, init) => {
    const reservation = await db.reserveSpend(limit, bark).catch((error) => {
      throw new StorageUnavailable('model_budget_storage_unavailable', {
        cause: error,
      })
    })
    // Local dev warns and proceeds when the daily spend/bark budget is spent;
    // production still fails the call. Without a reservation there is nothing
    // to settle, so the usage tally advances but reserved_usd stays untouched.
    if (!reservation) {
      if (enforce) throw new BudgetExceeded('daily_model_budget_exhausted')
      const spent = await db.spendLedger().catch(() => null)
      const used = spent
        ? `used $${spent.reservedUsd.toFixed(4)} of $${limit.toFixed(2)} across ${spent.calls} calls (${spent.barks} barks, ${spent.directors} directors), tokens in=${spent.inputTokens} out=${spent.outputTokens}`
        : `cap $${limit.toFixed(2)}`
      const hit = bark ? 'daily bark allowance' : 'daily USD budget'
      log(
        'model_budget_bypassed',
        `local dev: ${hit} exhausted (${used}); +$0.03 this ${bark ? 'bark' : 'call'}; allowing instead of enforcing`,
        'warn'
      )
    }
    const observation = modelTiming()
    let settled = false
    const settle = async () => {
      if (settled) return
      settled = true
      const cost = observation.finish()
      if (reservation)
        await db.settleSpend(reservation, cost).catch((error) => {
          throw new StorageUnavailable('model_budget_storage_unavailable', {
            cause: error,
          })
        })
      usage.calls += 1
      usage.inputTokens += cost.inputTokens
      usage.outputTokens += cost.outputTokens
      usage.estimatedUsd += cost.estimatedUsd
      usage.lastCall = observation.timing
      log(
        'model_call_timing',
        JSON.stringify({ ...observation.timing, ...cost })
      )
    }
    try {
      const response = await fetcher(input, init)
      observation.timing.status = response.status
      if (
        response.ok &&
        response.headers.get('content-type')?.includes('text/event-stream')
      ) {
        observation.timing.streaming = true
        const stream = observeModelStream(response, observation.read, settle)
        if (stream) return stream
      }
      if (response.ok)
        observation.read(
          await response
            .clone()
            .json()
            .catch(() => null)
        )
      await settle()
      return response
    } catch (error) {
      await settle()
      throw error
    }
  }
}
