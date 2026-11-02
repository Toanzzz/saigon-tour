import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { converse } from '@/features/conversation/converse'
import { resetEventSequence } from '@/shared/api/events'
import { cachedHistory } from '@/shared/api/history'
import { saveToken } from '@/shared/api/transport'
import { game, initialState, update } from '@/shared/state/game'

const encoder = new TextEncoder()
const frame = (event: object) => encoder.encode(`${JSON.stringify(event)}\n`)
const reply = {
  npcId: 'hoa',
  revision: 0,
  cached: false,
  party: null,
  reply: 'Try a warm bowl.',
  source: 'live',
  degraded: false,
  friendship: {},
  friendshipEvents: [],
  world: initialState().world,
  quests: [],
  questEvents: [],
  toolCalls: [],
}

beforeEach(() => {
  resetEventSequence()
  saveToken('guest-token')
  game.setState(() => ({
    ...initialState(),
    guestStatus: 'online',
    dialogue: {
      npc: 'hoa',
      requestId: crypto.randomUUID(),
      history: [],
      thinking: false,
      source: null,
    },
  }))
})
afterEach(() => vi.unstubAllGlobals())

function streamingTurn() {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      return new Response(
        new ReadableStream<Uint8Array>({
          start(value) {
            controller = value
          },
        }),
        { headers: { 'content-type': 'application/x-ndjson' } }
      )
    })
  )
  return {
    turn: converse('What should I eat?', 'chat'),
    send: (event: object) => controller.enqueue(frame(event)),
    close: () => controller.close(),
    ready: () => vi.waitFor(() => expect(controller).toBeDefined()),
  }
}

describe('partial NPC dialogue', () => {
  it('shows partial text before final state and persists only the final reply', async () => {
    const { turn, send, close, ready } = streamingTurn()
    const previousHistory = cachedHistory('hoa').length
    await ready()
    const [, options] = vi.mocked(fetch).mock.calls[0] ?? []
    const headers = new Headers(options?.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Authorization')).toBe('Bearer guest-token')
    expect(headers.get('Accept')).toBe('application/x-ndjson')
    send({ type: 'text', text: 'Try a warm' })
    await vi.waitFor(() =>
      expect(game.state.dialogue?.streamingText).toBe('Try a warm')
    )
    expect(game.state.dialogue?.thinking).toBe(true)
    expect(cachedHistory('hoa')).toHaveLength(previousHistory)
    expect(game.state.quests).toEqual([])
    send({ type: 'result', response: reply })
    close()
    await turn
    expect(game.state.dialogue?.thinking).toBe(false)
    expect(game.state.dialogue?.streamingText).toBeUndefined()
    expect(game.state.dialogue?.history.at(-1)?.content).toBe(reply.reply)
    expect(cachedHistory('hoa').at(-1)?.content).toBe(reply.reply)
  })

  it('clears partial text and falls back if a stream ends without a result', async () => {
    const { turn, send, close, ready } = streamingTurn()
    await ready()
    send({ type: 'text', text: 'This will be interrupted' })
    close()
    await turn
    expect(game.state.dialogue?.thinking).toBe(false)
    expect(game.state.dialogue?.streamingText).toBeUndefined()
    expect(game.state.dialogue?.history.at(-1)?.content).not.toBe(
      'This will be interrupted'
    )
  })

  it('does not inject late chunks into a different dialogue', async () => {
    const { turn, send, close, ready } = streamingTurn()
    await ready()
    update({
      dialogue: {
        npc: 'mai',
        requestId: 'different-dialogue',
        history: [],
        thinking: false,
        source: null,
      },
    })
    send({ type: 'text', text: 'Old reply' })
    send({ type: 'result', response: reply })
    close()
    await turn
    expect(game.state.dialogue?.npc).toBe('mai')
    expect(game.state.dialogue?.streamingText).toBeUndefined()
    expect(game.state.dialogue?.history).toEqual([])
  })
})
