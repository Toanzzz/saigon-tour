import { describe, expect, it } from 'vitest'
import { type HarnessUsage, meteredFetch } from '@/features/npc/meter'
import { modelTiming } from '@/features/npc/model-timing'
import { setupNpc } from './support/npc'

const ctx = setupNpc()
const usage = (): HarnessUsage => ({
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  estimatedUsd: 0,
})

describe('model response timing', () => {
  it('distinguishes a tool-only stream from a buffered response', () => {
    const observation = modelTiming()
    observation.read(
      { choices: [{ delta: { reasoning_content: 'private' } }] },
      true
    )
    expect(observation.timing.firstOutputMs).toBeNull()
    observation.read(
      {
        choices: [{ delta: { tool_calls: [{ index: 0, id: 'proposal' }] } }],
      },
      true
    )
    expect(observation.timing.firstOutputMs).toBeTypeOf('number')
    expect(observation.timing.firstTextMs).toBeNull()
  })
  it('records unary usage without inventing a first-text time', async () => {
    const stats = usage()
    const fetcher = meteredFetch(
      ctx.fx.db,
      (async () =>
        Response.json({
          usage: {
            prompt_tokens: 100,
            completion_tokens: 60,
            completion_tokens_details: { reasoning_tokens: 45 },
            prompt_tokens_details: { cached_tokens: 80 },
          },
        })) as typeof fetch,
      5,
      stats
    )
    await fetcher('https://example.test')
    expect(stats).toMatchObject({
      calls: 1,
      inputTokens: 100,
      outputTokens: 60,
      lastCall: {
        status: 200,
        streaming: false,
        firstOutputMs: null,
        firstTextMs: null,
        reasoningTokens: 45,
        cachedInputTokens: 80,
      },
    })
  })

  it('passes SSE through before completion and settles its final usage once', async () => {
    const stats = usage()
    const previousCalls = (await ctx.fx.db.spendLedger()).calls
    const encoder = new TextEncoder()
    let controller!: ReadableStreamDefaultController<Uint8Array>
    const source = new ReadableStream<Uint8Array>({
      start(value) {
        controller = value
      },
    })
    const fetcher = meteredFetch(
      ctx.fx.db,
      (async () =>
        new Response(source, {
          headers: { 'content-type': 'text/event-stream' },
        })) as typeof fetch,
      5,
      stats
    )
    const response = await fetcher('https://example.test')
    const reader = response.body?.getReader()
    controller.enqueue(
      encoder.encode(
        'data: {"choices":[{"delta":{"reasoning_content":"think"}}]}\n\n'
      )
    )
    await reader?.read()
    expect(stats.calls).toBe(0)
    controller.enqueue(
      encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n')
    )
    await reader?.read()
    controller.enqueue(
      encoder.encode(
        'data: {"choices":[],"usage":{"prompt_tokens":100,"completion_tokens":50,"completion_tokens_details":{"reasoning_tokens":40},"prompt_tokens_details":{"cached_tokens":80}}}\n\ndata: [DONE]\n\n'
      )
    )
    controller.close()
    while (!(await reader?.read())?.done) {}
    expect(stats).toMatchObject({
      calls: 1,
      inputTokens: 100,
      outputTokens: 50,
      lastCall: {
        streaming: true,
        reasoningTokens: 40,
        cachedInputTokens: 80,
      },
    })
    expect(stats.lastCall?.firstTextMs).toBeTypeOf('number')
    expect((await ctx.fx.db.spendLedger()).calls).toBe(previousCalls + 1)
  })

  it('keeps the reservation ceiling on a cancelled stream with unknown usage', async () => {
    const stats = usage()
    const fetcher = meteredFetch(
      ctx.fx.db,
      (async () =>
        new Response(new ReadableStream(), {
          headers: { 'content-type': 'text/event-stream' },
        })) as typeof fetch,
      5,
      stats
    )
    const response = await fetcher('https://example.test')
    await response.body?.cancel()
    expect(stats.calls).toBe(1)
    expect(stats.estimatedUsd).toBe(0.03)
    expect(stats.lastCall?.firstTextMs).toBeNull()
  })
})
