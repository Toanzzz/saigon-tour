import { once } from 'node:events'
import { createServer } from 'node:http'
import { createConnection } from 'node:net'
import { describe, expect, it } from 'vitest'
import { closeHttpServer, onStop } from '@/shared/stop'

function stopper() {
  const listeners = new Map<string, () => void>()
  const exits: number[] = []
  return {
    exits,
    on(signal: string, listener: () => void) {
      listeners.set(signal, listener)
    },
    exit(code: number) {
      exits.push(code)
    },
    emit(signal: 'SIGTERM' | 'SIGINT') {
      listeners.get(signal)?.()
    },
  }
}

describe('process stop', () => {
  it('releases once and exits on the first signal', async () => {
    const target = stopper()
    let releases = 0
    onStop(
      target,
      async () => {
        releases += 1
      },
      1000
    )
    target.emit('SIGINT')
    target.emit('SIGTERM')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(releases).toBe(1)
    expect(target.exits).toEqual([0])
  })

  it('exits when release stays pending', async () => {
    const target = stopper()
    onStop(target, () => new Promise(() => undefined), 30)
    target.emit('SIGTERM')
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(target.exits).toEqual([0])
  })

  it('closes the HTTP server while a client holds the socket', async () => {
    const server = createServer((_request, response) => response.end('ok'))
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const socket = createConnection({ port: address.port, host: '127.0.0.1' })
    await once(socket, 'connect')
    const closed = await Promise.race([
      closeHttpServer(server).then(() => 'closed' as const),
      new Promise<'hung'>((resolve) => setTimeout(() => resolve('hung'), 300)),
    ])
    socket.destroy()
    expect(closed).toBe('closed')
  })
})
