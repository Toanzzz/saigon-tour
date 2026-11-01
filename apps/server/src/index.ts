import type { Server } from 'node:http'
import { serve } from '@hono/node-server'
import { PostgresStore } from '@mastra/pg'
import { createApp } from './app'
import { createDb, isLiveConfigured, log, readConfig } from './shared'
import { closeHttpServer, onStop } from './shared/stop'

const config = readConfig()
const db = await createDb(config.databaseUrl, config.barkDailyLimit)
const storage = new PostgresStore({
  id: 'npc-memory',
  pool: db.pool,
  schemaName: 'mastra',
})
await storage.init()
const app = createApp(config, fetch, { db, orm: db.orm, storage })
const sweep = async () => {
  for (const id of await db.sweep()) await app.harness.clearMemory(id)
}
await sweep()
const retention = setInterval(
  () =>
    void sweep().catch(() =>
      log('retention_failed', 'Retention sweep unavailable', 'warn')
    ),
  86400000
)
retention.unref()
const server = serve({
  fetch: app.fetch,
  port: config.port,
  hostname: '0.0.0.0',
})
await app.realtime.attach(server as Server)
log(
  'server_started',
  `Listening on port ${config.port}; NPC mode: ${isLiveConfigured(config) ? 'live' : 'fallback'}`
)
onStop(process, async () => {
  clearInterval(retention)
  await app.realtime.shutdown().catch(() => undefined)
  await closeHttpServer(server as Server)
  await db.close().catch(() => undefined)
})
