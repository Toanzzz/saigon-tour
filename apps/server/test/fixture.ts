import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { InMemoryStore } from '@mastra/core/storage'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { Fetcher } from '../src/app'
import type { ServerConfig } from '../src/config'
import { GameDb } from '../src/db'
import { NpcHarness } from '../src/npc/mastra'

export async function fixture(now?: () => Date, barkLimit = 200) {
  const sql = new PGlite()
  await migrate(drizzle(sql), {
    migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
  })
  const db = new GameDb(sql, undefined, now, barkLimit)
  const storage = new InMemoryStore({ id: crypto.randomUUID() })
  await storage.init()
  return {
    sql,
    db,
    storage,
    harness(config: ServerConfig, fetcher: Fetcher = fetch) {
      return new NpcHarness(config, fetcher, db, storage)
    },
    close: () => sql.close(),
  }
}
