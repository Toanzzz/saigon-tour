import { PostgresStore } from '@mastra/pg'
import { readConfig } from './config'
import { createDb } from './db'
import { NpcHarness } from './npc/mastra'

const config = readConfig()
const db = await createDb(config.databaseUrl, config.barkDailyLimit)
try {
  const storage = new PostgresStore({
    id: 'npc-memory',
    pool: db.pool,
    schemaName: 'mastra',
  })
  await storage.init()
  await new NpcHarness(config, fetch, db, storage).prewarm()
} finally {
  await db.close()
}
