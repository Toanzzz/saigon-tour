import type { Fetcher } from '../app'
import type { GameDb } from '../db'

export interface HarnessUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  estimatedUsd: number
}

export class BudgetExceeded extends Error {}

/** Reserve every HTTP model step, including retries, before calling the provider. */
export function meteredFetch(
  db: GameDb,
  fetcher: Fetcher,
  limit: number,
  usage: HarnessUsage,
  bark = false
): Fetcher {
  return async (input, init) => {
    const reservation = await db.reserveSpend(limit, bark)
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
      await db.settleSpend(reservation, {
        inputTokens,
        outputTokens,
        estimatedUsd,
      })
      usage.calls += 1
      usage.inputTokens += inputTokens
      usage.outputTokens += outputTokens
      usage.estimatedUsd += estimatedUsd
    }
  }
}
