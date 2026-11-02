/** Provider timing excludes the spend reservation and never records prompts. */
export interface ModelTiming {
  status: number | null
  totalMs: number
  firstTextMs: number | null
  reasoningTokens: number
  cachedInputTokens: number
}

export function modelTiming() {
  const started = performance.now()
  let inputTokens = 0
  let outputTokens = 0
  let knownUsage = false
  const timing: ModelTiming = {
    status: null,
    totalMs: 0,
    firstTextMs: null,
    reasoningTokens: 0,
    cachedInputTokens: 0,
  }
  const elapsed = () => Math.round(performance.now() - started)
  const read = (body: unknown, streaming = false) => {
    if (!body || typeof body !== 'object') return
    const data = body as {
      choices?: { delta?: { content?: unknown } }[]
      usage?: {
        prompt_tokens?: number
        completion_tokens?: number
        completion_tokens_details?: { reasoning_tokens?: number }
        prompt_tokens_details?: { cached_tokens?: number }
      }
    }
    if (
      streaming &&
      timing.firstTextMs === null &&
      data.choices?.some(
        (choice) =>
          typeof choice.delta?.content === 'string' &&
          choice.delta.content.length > 0
      )
    )
      timing.firstTextMs = elapsed()
    const usage = data.usage
    if (
      typeof usage?.prompt_tokens === 'number' &&
      typeof usage.completion_tokens === 'number' &&
      Number.isFinite(usage.prompt_tokens) &&
      Number.isFinite(usage.completion_tokens) &&
      usage.prompt_tokens >= 0 &&
      usage.completion_tokens >= 0
    ) {
      knownUsage = true
      inputTokens = usage.prompt_tokens
      outputTokens = usage.completion_tokens
      timing.reasoningTokens = count(
        usage.completion_tokens_details?.reasoning_tokens
      )
      timing.cachedInputTokens = count(
        usage.prompt_tokens_details?.cached_tokens
      )
    }
  }
  return {
    timing,
    read,
    finish: () => {
      timing.totalMs = elapsed()
      return {
        inputTokens,
        outputTokens,
        estimatedUsd: knownUsage
          ? inputTokens * (0.5 / 1e6) + outputTokens * (2 / 1e6)
          : 0.03,
      }
    },
  }
}

function count(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : 0
}

/** Observe SSE as it is consumed; never drain/buffer it before returning. */
export function observeModelStream(
  response: Response,
  read: (body: unknown, streaming: boolean) => void,
  finish: () => Promise<void>
) {
  const reader = response.body?.getReader()
  if (!reader) return null
  const decoder = new TextDecoder()
  let pending = ''
  let settlement: Promise<void> | undefined
  const settle = () => {
    settlement ??= finish()
    return settlement
  }
  const inspect = (text: string) => {
    pending += text
    let end = pending.indexOf('\n')
    while (end >= 0) {
      const line = pending.slice(0, end).trimEnd()
      pending = pending.slice(end + 1)
      if (line.startsWith('data:')) {
        try {
          read(JSON.parse(line.slice(5).trim()), true)
        } catch {
          // Ignore event terminators and malformed metadata; SDK validates SSE.
        }
      }
      end = pending.indexOf('\n')
    }
  }
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const chunk = await reader.read()
          if (chunk.done) {
            inspect(`${decoder.decode()}\n`)
            await settle()
            controller.close()
          } else {
            inspect(decoder.decode(chunk.value, { stream: true }))
            controller.enqueue(chunk.value)
          }
        } catch (error) {
          try {
            await settle()
          } catch (storageError) {
            controller.error(storageError)
            return
          }
          controller.error(error)
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason)
        } finally {
          await settle()
        }
      },
    }),
    {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }
  )
}
