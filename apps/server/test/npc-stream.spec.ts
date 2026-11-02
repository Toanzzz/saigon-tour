import { NpcStreamEventSchema } from '@saigon/shared'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '@/app'
import { ask, hoaDelivery, live, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()
const encoder = new TextEncoder()
const data = (body: object) =>
  encoder.encode(`data: ${JSON.stringify(body)}\n\n`)
const delta = (value: object) => ({
  id: 'stream',
  choices: [{ index: 0, delta: value, finish_reason: null }],
})

describe('streamed NPC interactions', () => {
  it('delivers visible text before completion, without leaking reasoning', async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>
    const fetcher = vi.fn(async () => {
      return new Response(
        new ReadableStream<Uint8Array>({
          start(value) {
            controller = value
          },
        }),
        { headers: { 'content-type': 'text/event-stream' } }
      )
    })
    const harness = ctx.fx.harness(live, fetcher as unknown as typeof fetch)
    const texts: string[] = []
    let done = false
    const pending = harness
      .interact('hoa', ask('What should I eat?'), ctx.playerId, {
        onText: (text) => {
          texts.push(text)
        },
      })
      .then((response) => {
        done = true
        return response
      })
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled())
    controller.enqueue(data(delta({ reasoning_content: 'private thoughts' })))
    controller.enqueue(data(delta({ role: 'assistant', content: 'A warm' })))
    await vi.waitFor(() => expect(texts).toContain('A warm'))
    expect(done).toBe(false)
    expect(texts.join('')).not.toContain('private thoughts')
    controller.enqueue(data(delta({ content: ' bowl.' })))
    controller.enqueue(
      data({
        id: 'stream',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 20 },
      })
    )
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    controller.close()
    const result = await pending
    expect(result).toMatchObject({ source: 'live', reply: 'A warm bowl.' })
    expect(harness.usage.calls).toBe(1)
    expect(harness.usage.lastCall?.firstTextMs).toBeTypeOf('number')
    expect((await harness.history('hoa', ctx.playerId)).messages).toHaveLength(
      2
    )
  })

  it('never streams unvalidated errand narration', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([{ tool: ['proposeQuest', hoaDelivery()] }, 'hang'])
    )
    const onText = vi.fn()
    const result = await harness.interact(
      'hoa',
      ask('Can I help?'),
      ctx.playerId,
      { onText }
    )
    expect(onText).not.toHaveBeenCalled()
    expect(result.source).toBe('live')
    expect(result.reply).toContain(hoaDelivery().description)
    expect(harness.usage.calls).toBe(1)
  })

  it('negotiates NDJSON while keeping JSON requests compatible', async () => {
    const guest = await ctx.fx.guest()
    const app = createApp(live, scripted([{ text: 'Welcome.' }]), ctx.fx)
    const response = await app.request('/npc/hoa/interact', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${guest.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
      },
      body: JSON.stringify(ask('Can I help?')),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain(
      'application/x-ndjson'
    )
    const events = (await response.text())
      .trim()
      .split('\n')
      .map((line) => NpcStreamEventSchema.parse(JSON.parse(line)))
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('result')
  })
})
