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
  it.each([false, true])(
    'streams a general chat reply with active errand=%s',
    async (active) => {
      const seen: { stream?: boolean }[] = []
      const harness = ctx.fx.harness(
        live,
        scripted([{ text: 'I am doing well.' }], seen)
      )
      if (active)
        await harness.game.proposeQuest(ctx.playerId, 'hoa', hoaDelivery())
      const onText = vi.fn()
      const result = await harness.interact(
        'hoa',
        ask('How are you?'),
        ctx.playerId,
        { onText }
      )
      expect(seen[0]?.stream).toBe(true)
      expect(onText).toHaveBeenCalledWith('I am doing well.')
      expect(result.reply).toBe('I am doing well.')
      expect(harness.usage.lastCall?.firstTextMs).toBeTypeOf('number')
    }
  )
  it('clears interim narration between tool steps and records only the final reply', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([
        { tool: ['getContext', {}] },
        { text: 'You have thirty coins.' },
      ])
    )
    const onText = vi.fn()
    const result = await harness.interact(
      'hoa',
      ask('How many coins do I have?', {
        events: [{ type: 'visit', locationId: 'market' }],
      }),
      ctx.playerId,
      { onText }
    )
    const texts = onText.mock.calls.map(([text]) => text)
    const interim = texts.indexOf('Let me see.')
    expect(interim).toBeGreaterThanOrEqual(0)
    expect(texts[interim + 1]).toBe('')
    expect(texts.at(-1)).toBe('You have thirty coins.')
    expect(result.reply).toBe('You have thirty coins.')
    const history = await harness.history('hoa', ctx.playerId)
    expect(history.messages.at(-1)?.text).toBe(result.reply)
    expect(history.messages).toHaveLength(2)
  })
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

  it('clears tool-step narration and returns only the validated errand', async () => {
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
    expect(onText).toHaveBeenCalledWith('Let me see.')
    expect(onText).toHaveBeenLastCalledWith('')
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
    expect(events.some((event) => event.type === 'text')).toBe(true)
    expect(events.at(-1)?.type).toBe('result')
  })
})
