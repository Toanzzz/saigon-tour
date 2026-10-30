import { serve } from '@hono/node-server'
import { PostgresStore } from '@mastra/pg'
import { createApp } from './app'
import { isLiveConfigured, readConfig } from './config'
import { createDb } from './db'
import { log } from './logger'

const config = readConfig()
const db = await createDb(config.databaseUrl, config.barkDailyLimit)
const storage = new PostgresStore({
  id: 'npc-memory',
  pool: db.pool,
  schemaName: 'mastra',
})
await storage.init()
const app = createApp(config, fetch, { db, storage })
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
log(
  'server_started',
  `Listening on port ${config.port}; NPC mode: ${isLiveConfigured(config) ? 'live' : 'fallback'}`
)
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    clearInterval(retention)
    server.close(() => {
      void db.close()
    })
  })
