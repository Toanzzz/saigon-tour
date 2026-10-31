import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { InMemoryStore } from '@mastra/core/storage'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { Fetcher } from '@/app'
import { createAuth } from '@/features/auth'
import { NpcHarness } from '@/features/npc'
import type { ServerConfig } from '@/shared'
import { GameDb, readConfig } from '@/shared'
import * as schema from '@/shared/db/schema'

export async function fixture(now?: () => Date, barkLimit = 200) {
  const sql = new PGlite()
  const orm = drizzle(sql, { schema })
  await migrate(orm, {
    migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
  })
  const db = new GameDb(sql, undefined, now, barkLimit)
  const storage = new InMemoryStore({ id: crypto.randomUUID() })
  await storage.init()
  const auth = createAuth(readConfig({}), orm, db)
  return {
    sql,
    db,
    orm,
    storage,
    auth,
    /** An anonymous Better Auth session plus its saved player. */
    async guest() {
      const { token, user } = await auth.api.signInAnonymous()
      return { token, player: await db.ensurePlayer(user) }
    },
    harness(config: ServerConfig, fetcher: Fetcher = fetch) {
      return new NpcHarness(config, fetcher, db, storage)
    },
    close: () => sql.close(),
  }
}
