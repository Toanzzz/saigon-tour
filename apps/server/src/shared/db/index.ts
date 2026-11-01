import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { GuestPlayer, NpcId } from '@saigon/shared'
import {
  GuestPlayerSchema,
  randomPlayerColor,
  STARTING_CURRENCY,
} from '@saigon/shared'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import * as schema from './schema'

export type { PlayerSave, SqlClient } from './player-save'

import { PlayerMutations } from './player-mutations'
import type { PlayerSave, SqlClient } from './player-save'

export interface Reservation {
  day: string
  id: string
}
const initial = (): PlayerSave => ({
  friendship: {},
  revision: 0,
  world: {
    locationId: 'market',
    inventory: {},
    visitedLocations: ['market'],
    talkedTo: [],
    deliveredItems: [],
    completedQuestIds: [],
    currency: STARTING_CURRENCY,
  },
  quests: [],
  completed: [],
  reputation: 0,
})
const publicPlayer = (r: Record<string, unknown>): GuestPlayer =>
  GuestPlayerSchema.parse(r)

export class GameDb {
  private mutations: PlayerMutations
  private reservations = new Set<string>()
  constructor(
    readonly sql: SqlClient,
    readonly pool?: Pool,
    private readonly now = () => new Date(),
    private readonly barkLimit = 200
  ) {
    this.mutations = new PlayerMutations(sql, pool)
  }
  async health() {
    await this.sql.query('SELECT 1')
    return true
  }
  /** The player saved for an auth user, created on first sight. */
  async ensurePlayer(user: { id: string; name: string }) {
    const save = initial()
    await this.sql.query(
      'INSERT INTO players(id,user_id,name,color,world,quests,completed,reputation) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id) DO NOTHING',
      [
        randomUUID(),
        user.id,
        user.name,
        randomPlayerColor(),
        JSON.stringify(save.world),
        '[]',
        '[]',
        0,
      ]
    )
    const { rows } = await this.sql.query(
      'UPDATE players SET seen_at=now() WHERE user_id=$1 RETURNING *',
      [user.id]
    )
    if (!rows[0]) throw new Error('player_not_found')
    return publicPlayer(rows[0])
  }
  async playerIdForUser(userId: string) {
    const { rows } = await this.sql.query(
      'SELECT id FROM players WHERE user_id=$1',
      [userId]
    )
    return (rows[0]?.id as string | undefined) ?? null
  }
  /** Move a player's save to another auth user (anonymous account linking). */
  async transferPlayer(fromUserId: string, toUserId: string) {
    const { rows } = await this.sql.query(
      'UPDATE players SET user_id=$2 WHERE user_id=$1 RETURNING id',
      [fromUserId, toUserId]
    )
    return (rows[0]?.id as string | undefined) ?? null
  }
  async rename(id: string, name: string) {
    const { rows } = await this.sql.query(
      'UPDATE players SET name=$2 WHERE id=$1 RETURNING *',
      [id, name]
    )
    if (!rows[0]) throw new Error('player_not_found')
    return publicPlayer(rows[0])
  }
  async player(id: string) {
    const { rows } = await this.sql.query('SELECT * FROM players WHERE id=$1', [
      id,
    ])
    if (!rows[0]) throw new Error('player_not_found')
    return publicPlayer(rows[0])
  }
  async readPlayer(id: string): Promise<PlayerSave> {
    return this.player(id)
  }
  mutatePlayers<T>(
    ids: string[],
    fn: (saves: Map<string, PlayerSave>, client: SqlClient) => T | Promise<T>
  ): Promise<T> {
    return this.mutations.run(ids, fn)
  }
  mutatePlayer<T>(
    id: string,
    fn: (save: PlayerSave, client: SqlClient) => T | Promise<T>
  ): Promise<T> {
    return this.mutatePlayers([id], (saves, client) => {
      const save = saves.get(id)
      if (!save) throw new Error('player_not_found')
      return fn(save, client)
    })
  }
  async reset(id: string) {
    await this.mutatePlayer(id, async (save, client) => {
      const revision = save.revision
      Object.assign(save, initial(), { revision })
      await client.query('DELETE FROM npc_facts WHERE player_id=$1', [id])
      await client.query('DELETE FROM quest_completions WHERE player_id=$1', [
        id,
      ])
    })
    return this.player(id)
  }
  async rememberFact(fact: {
    npcId: NpcId
    playerId: string
    fact: string
    importance: string
  }) {
    await this.mutatePlayer(fact.playerId, async (_save, client) => {
      await client.query(
        'INSERT INTO npc_facts(player_id,npc_id,fact,importance) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [fact.playerId, fact.npcId, fact.fact, fact.importance]
      )
      await client.query(
        "DELETE FROM npc_facts WHERE player_id=$1 AND npc_id=$2 AND fact NOT IN (SELECT fact FROM npc_facts WHERE player_id=$1 AND npc_id=$2 ORDER BY CASE importance WHEN 'high' THEN 2 WHEN 'medium' THEN 1 ELSE 0 END DESC, created_at DESC LIMIT 12)",
        [fact.playerId, fact.npcId]
      )
    })
    return true
  }
  async recallFacts(npcId: NpcId, playerId: string) {
    const { rows } = await this.sql.query(
      'SELECT npc_id AS "npcId",player_id AS "playerId",fact,importance,created_at AS "createdAt" FROM npc_facts WHERE npc_id=$1 AND player_id=$2 ORDER BY created_at',
      [npcId, playerId]
    )
    return rows as {
      npcId: NpcId
      playerId: string
      fact: string
      importance: 'low' | 'medium' | 'high'
      createdAt: string
    }[]
  }
  async reserveDirector(limit: number): Promise<boolean> {
    const day = this.now().toISOString().slice(0, 10)
    await this.sql.query(
      'INSERT INTO model_spend(day) VALUES($1) ON CONFLICT DO NOTHING',
      [day]
    )
    const { rows } = await this.sql.query(
      'UPDATE model_spend SET directors=directors+1 WHERE day=$1 AND directors < $2 RETURNING day',
      [day, limit]
    )
    return rows.length > 0
  }
  async reserveSpend(limit: number, bark = false): Promise<Reservation | null> {
    const day = this.now().toISOString().slice(0, 10)
    await this.sql.query(
      'INSERT INTO model_spend(day) VALUES($1) ON CONFLICT DO NOTHING',
      [day]
    )
    const { rows } = await this.sql.query(
      'UPDATE model_spend SET calls=calls+1,reserved_usd=reserved_usd+0.03,barks=barks+$3 WHERE day=$1 AND reserved_usd+0.03 <= $2 AND ($3=0 OR barks < $4) RETURNING day',
      [day, limit, bark ? 1 : 0, this.barkLimit]
    )
    if (!rows.length) return null
    const reservation = { day, id: randomUUID() }
    this.reservations.add(reservation.id)
    return reservation
  }
  async settleSpend(
    r: Reservation,
    usage: { inputTokens: number; outputTokens: number; estimatedUsd: number }
  ) {
    if (!this.reservations.delete(r.id)) return
    await this.sql.query(
      'UPDATE model_spend SET reserved_usd=GREATEST(0,reserved_usd-0.03+$2),input_tokens=input_tokens+$3,output_tokens=output_tokens+$4 WHERE day=$1',
      [r.day, usage.estimatedUsd, usage.inputTokens, usage.outputTokens]
    )
  }
  async getGreeting(key: string) {
    const { rows } = await this.sql.query(
      'SELECT reply,source FROM npc_greetings WHERE key=$1',
      [key]
    )
    return (rows[0] as { reply: string; source: 'live' | 'fallback' }) ?? null
  }
  async putGreeting(key: string, reply: string, source: string) {
    await this.sql.query(
      'INSERT INTO npc_greetings(key,reply,source) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
      [key, reply, source]
    )
  }
  /** Remove anonymous and legacy players unseen for 30 days. */
  async sweep() {
    const stale = `seen_at < now()-interval '30 days' AND (user_id IS NULL OR user_id IN (SELECT id FROM "user" WHERE is_anonymous))`
    const { rows } = await this.sql.query(
      `SELECT id,user_id FROM players WHERE ${stale}`
    )
    await this.sql.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [
      rows.map((r) => r.user_id).filter(Boolean),
    ])
    await this.sql.query(`DELETE FROM players WHERE ${stale}`)
    return rows.map((r) => r.id as string)
  }
  async close() {
    await this.pool?.end()
  }
}
export async function createDb(url: string, barkLimit = 200) {
  const pool = new Pool({ connectionString: url, max: 12 })
  const migrationsFolder = [
    'drizzle',
    'apps/server/drizzle',
    fileURLToPath(new URL('../../../drizzle', import.meta.url)),
  ].find((path) => existsSync(`${path}/meta/_journal.json`))
  if (!migrationsFolder) throw new Error('database_migrations_missing')
  const orm = drizzle(pool, { schema })
  await migrate(orm, { migrationsFolder })

  return Object.assign(new GameDb(pool, pool, undefined, barkLimit), {
    pool,
    orm,
  })
}
