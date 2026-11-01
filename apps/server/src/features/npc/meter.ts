import type { GameDb } from '@/shared/db'
import type { Fetcher } from '@/shared/http'

export interface HarnessUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  estimatedUsd: number
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
  bark = false
): Fetcher {
  return async (input, init) => {
    const reservation = await db.reserveSpend(limit, bark).catch((error) => {
      throw new StorageUnavailable('model_budget_storage_unavailable', {
        cause: error,
      })
    })
    if (!reservation) throw new BudgetExceeded('daily_model_budget_exhausted')
    let inputTokens = 0
    let outputTokens = 0
    // Unknown usage stays at the reservation ceiling; failures can still be billed.
    let estimatedUsd = 0.03
    try {
      const response = await fetcher(input, init)
      if (response.ok) {
        const body = await response
          .clone()
          .json()
          .catch(() => null)
        const tokens = body?.usage
        if (
          Number.isFinite(tokens?.prompt_tokens) &&
          Number.isFinite(tokens?.completion_tokens) &&
          tokens.prompt_tokens >= 0 &&
          tokens.completion_tokens >= 0
        ) {
          inputTokens = tokens.prompt_tokens
          outputTokens = tokens.completion_tokens
          estimatedUsd = inputTokens * (0.5 / 1e6) + outputTokens * (2 / 1e6)
        }
      }
      return response
    } finally {
      await db
        .settleSpend(reservation, { inputTokens, outputTokens, estimatedUsd })
        .catch((error) => {
          throw new StorageUnavailable('model_budget_storage_unavailable', {
            cause: error,
          })
        })
      usage.calls += 1
      usage.inputTokens += inputTokens
      usage.outputTokens += outputTokens
      usage.estimatedUsd += estimatedUsd
    }
  }
}
