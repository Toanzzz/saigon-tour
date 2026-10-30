import { upgradeWebSocket } from '@hono/node-server'
import type { Hono } from 'hono'
import { WebSocketServer } from 'ws'
import type { ServerConfig } from '../config'
import type { GameDb } from '../db'
import type { NpcHarness } from '../npc/mastra'
import { PartyService } from '../party'
import { RoomManager } from './rooms'
import { SocketSession } from './session'

export type { Room, RoomMember, RoomSocket } from './rooms'
export { RoomManager } from './rooms'

export function createRealtime(
  app: Hono,
  config: ServerConfig,
  harness: NpcHarness,
  db: GameDb,
  now = Date.now
) {
  const manager = new RoomManager(harness, now)
  const party = new PartyService(manager, db, now)
  harness.game.team = party
  const sessions = new Set<SocketSession>()
  const server = new WebSocketServer({ noServer: true, maxPayload: 4096 })
  let stopped = false
  app.get(
    '/ws',
    (c, next) => {
      const origin = c.req.header('Origin')
      if (!origin || !config.origins.includes(origin))
        return c.json({ error: 'forbidden_origin' }, 403)
      if (stopped || sessions.size >= 400)
        return c.json({ error: 'server_full' }, 503)
      return next()
    },
    upgradeWebSocket(() => {
      let session: SocketSession | undefined
      return {
        onOpen(_event, socket) {
          if (stopped || sessions.size >= 400) {
            socket.close(1013, 'server_full')
            return
          }
          session = new SocketSession(socket, manager, db, harness.game, {
            onMessage: (id, message) => party.handle(id, message),
            onConnected: (id) => party.connected(id),
          })
          sessions.add(session)
        },
        onMessage(event) {
          session?.receive(event.data)
        },
        onClose() {
          if (session) {
            session.close()
            sessions.delete(session)
          }
        },
        onError() {
          if (session) {
            session.close(1011, 'socket_error')
            sessions.delete(session)
          }
        },
      }
    })
  )
  manager.start()
  return {
    manager,
    party,
    server,
    shutdown() {
      stopped = true
      for (const session of sessions) session.close(1012, 'server_restart')
      sessions.clear()
      manager.shutdown()
      // ws waits for closing handshakes before finishing.
      for (const client of server.clients) {
        client.close(1012, 'server_restart')
        const timer = setTimeout(() => client.terminate(), 1000)
        timer.unref()
      }
      server.close()
    },
  }
}
