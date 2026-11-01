import type { Server } from 'node:http'

type Stoppable = {
  on(signal: 'SIGTERM' | 'SIGINT', listener: () => void): void
  exit(code: number): void
}

/**
 * Exit on SIGINT/SIGTERM. Bun's file watcher drops the force timer when it
 * reloads this process; an external signal still exits if release hangs.
 */
export function onStop(
  target: Stoppable,
  release: () => Promise<void>,
  forceMs = 2000
) {
  let stopping = false
  const stop = () => {
    if (stopping) return
    stopping = true
    const force = setTimeout(() => target.exit(0), forceMs)
    void release().finally(() => {
      clearTimeout(force)
      target.exit(0)
    })
  }
  for (const signal of ['SIGTERM', 'SIGINT'] as const) target.on(signal, stop)
}

/** Drop open sockets so `close` can finish while a client is connected. */
export function closeHttpServer(server: Server) {
  server.closeAllConnections()
  return new Promise<void>((resolve) => {
    server.close(() => resolve())
  })
}
