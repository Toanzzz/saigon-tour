import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { expect, it } from 'vitest'

it('upgrades the applied item-action migration without losing its receipt ledger', async () => {
  const sql = new PGlite()
  try {
    const folder = fileURLToPath(new URL('../drizzle', import.meta.url))
    const original = await readFile(`${folder}/0010_item_actions.sql`, 'utf8')
    const hash = createHash('sha256').update(original).digest('hex')
    expect(hash).toBe(
      'b34087874c8eb30bd1891a70200e54222fdce8f3bb4704b27337962632a8f5f0'
    )
    await sql.exec(`
      CREATE TABLE players(id uuid PRIMARY KEY);
      CREATE SCHEMA drizzle;
      CREATE TABLE drizzle.__drizzle_migrations(
        id serial PRIMARY KEY, hash text NOT NULL, created_at bigint
      );
      ${original}
    `)
    const playerId = randomUUID()
    const requestId = randomUUID()
    await sql.query('INSERT INTO players(id) VALUES($1)', [playerId])
    await sql.query(
      'INSERT INTO item_actions(player_id,request_id,fingerprint,receipt) VALUES($1,$2,$3,$4)',
      [playerId, requestId, 'kept', '{"requestId":"kept","restore":40}']
    )
    await sql.query(
      'INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES($1,$2)',
      [hash, 1793740000000]
    )
    await migrate(drizzle(sql), { migrationsFolder: folder })
    const receipts = await sql.query(
      'SELECT fingerprint,receipt FROM item_actions WHERE player_id=$1',
      [playerId]
    )
    expect(receipts.rows).toEqual([
      {
        fingerprint: 'kept',
        receipt: { requestId: 'kept', restore: 40 },
      },
    ])
    const constraints = await sql.query(
      "SELECT conname FROM pg_constraint WHERE conrelid='item_actions'::regclass AND contype='f'"
    )
    expect(constraints.rows).toEqual([
      { conname: 'item_actions_player_id_players_id_fk' },
    ])
  } finally {
    await sql.close()
  }
})
