import type { InteractRequestSchema } from '@saigon/shared'
import { afterAll, beforeAll, beforeEach } from 'vitest'
import type { z } from 'zod'
import { readConfig, type ServerConfig } from '@/shared'
import { fixture } from '../fixture'

export type InteractInput = z.input<typeof InteractRequestSchema>

export const offline: ServerConfig = {
  ...readConfig({}),
  apiKey: undefined,
  production: true,
}
export const live: ServerConfig = {
  ...offline,
  apiKey: 'test-key',
  timeoutMs: 200,
}

export const worldContext = {
  playerLocation: 'market' as const,
  nearbyNpcs: [],
  timeOfDay: 'afternoon' as const,
}
export const ask = (
  message: string,
  extra: Partial<InteractInput> = {}
): InteractInput => ({
  message,
  worldContext,
  ...extra,
})

export type Step =
  | { text?: string; tool?: [string, object] }
  | 'hang'
  | 'garbage'
/** OpenAI-compatible fake that replays scripted assistant steps. */
export function scripted(steps: Step[], seen: unknown[] = []) {
  let index = 0
  return (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    seen.push(body)
    const step = steps[Math.min(index++, steps.length - 1)]
    if (step === 'hang')
      return new Promise<Response>((_r, reject) =>
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason)
        )
      )
    if (step === 'garbage') return new Response('not json', { status: 200 })
    const message = step.tool
      ? {
          role: 'assistant',
          content: 'Let me see.',
          tool_calls: [
            {
              id: `call-${index}`,
              type: 'function',
              function: {
                name: step.tool[0],
                arguments: JSON.stringify(step.tool[1]),
              },
            },
          ],
        }
      : { role: 'assistant', content: step.text }
    return new Response(
      JSON.stringify({
        id: `r${index}`,
        choices: [
          {
            index: 0,
            message,
            finish_reason: step.tool ? 'tool_calls' : 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 20 },
      }),
      { headers: { 'content-type': 'application/json' } }
    )
  }) as typeof fetch
}

/** Registers the shared harness fixture hooks and exposes live accessors. */
export function setupNpc() {
  let playerId: string
  let fx: Awaited<ReturnType<typeof fixture>>
  beforeAll(async () => {
    fx = await fixture()
  })
  afterAll(async () => {
    await fx.close()
  })
  beforeEach(async () => {
    playerId = (await fx.guest()).player.id
  })
  return {
    get fx() {
      return fx
    },
    get playerId() {
      return playerId
    },
  }
}
