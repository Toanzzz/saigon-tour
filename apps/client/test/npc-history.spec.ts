import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cachedHistory,
  fetchHistory,
  historyKey,
  mergeHistory,
} from '@/shared/api/history'
import { queryClient } from '@/shared/api/query'
import { game, initialState, update } from '@/shared/state/game'

const line = {
  role: 'assistant' as const,
  text: 'A saved reply.',
  at: '2026-11-03T07:32:00Z',
}
beforeEach(() => {
  game.setState(() => initialState())
  queryClient.removeQueries({ queryKey: ['npc-history'] })
})
afterEach(() => vi.unstubAllGlobals())

describe('NPC history reconciliation', () => {
  it('adopts IDs for legacy entries without duplicating history, in either merge order', () => {
    const current = { ...line, id: 'persisted-message' }
    expect(mergeHistory([line], [current])).toEqual([current])
    expect(mergeHistory([current], [line])).toEqual([current])
    expect(mergeHistory([current], [current])).toEqual([current])
    expect(
      mergeHistory([current], [{ ...current, id: 'different-message' }])
    ).toHaveLength(2)
  })

  it('preserves a local message appended while server history is loading', async () => {
    let resolve!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done
          })
      )
    )
    const request = fetchHistory('hoa')
    await vi.waitFor(() => expect(resolve).toBeDefined())
    queryClient.setQueryData(historyKey('hoa'), {
      messages: [{ ...line, id: 'offline-message' }],
    })
    resolve(
      Response.json({
        messages: [{ ...line, id: 'server-message', text: 'Earlier reply.' }],
      })
    )
    await request
    expect(cachedHistory('hoa').map((message) => message.id)).toEqual([
      'offline-message',
      'server-message',
    ])
  })

  it('rejects late history after a journey or identity reset', async () => {
    let resolve!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done
          })
      )
    )
    const request = fetchHistory('hoa')
    const rejected = expect(request).rejects.toThrow('history_session_changed')
    await vi.waitFor(() => expect(resolve).toBeDefined())
    update({ sessionId: crypto.randomUUID() })
    resolve(Response.json({ messages: [line] }))
    await rejected
    expect(cachedHistory('hoa')).toEqual([])
  })
})
