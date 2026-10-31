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
