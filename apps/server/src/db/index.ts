import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { GuestPlayer, NpcId, Quest, WorldState } from '@saigon/shared'
import { GuestPlayerSchema, STARTING_CURRENCY } from '@saigon/shared'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

export interface PlayerSave {
  revision: number
  world: WorldState
  quest: Quest | null
  completed: Quest[]
  reputation: number
}
interface SqlClient {
  query(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[] }>
}
export interface Reservation {
  day: string
  id: string
}
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const initial = (): PlayerSave => ({
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
  quest: null,
  completed: [],
  reputation: 0,
})
const publicPlayer = (r: Record<string, unknown>): GuestPlayer =>
  GuestPlayerSchema.parse(r)

export class GameDb {
  private locks = new Map<string, Promise<unknown>>()
  private reservations = new Set<string>()
  constructor(
    readonly sql: SqlClient,
    readonly pool?: Pool,
    private readonly now = () => new Date(),
    private readonly barkLimit = 200
  ) {}
  async health() {
    await this.sql.query('SELECT 1')
    return true
  }
  async createGuest() {
    const token = randomBytes(32).toString('base64url')
    const id = randomUUID()
    const name = `${['Sóc Nắng', 'Mây Xanh', 'Sen Hồng', 'Gió Mát'][Math.floor(Math.random() * 4)]} ${Math.floor(Math.random() * 90) + 10}`
    const color = ['#f6c568', '#85c7b6', '#ed9d86', '#b6a2dc'][
      Math.floor(Math.random() * 4)
    ]
    const save = initial()
    const { rows } = await this.sql.query(
      'INSERT INTO players(id,token_hash,name,color,world,quest,completed,reputation) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [id, hash(token), name, color, JSON.stringify(save.world), null, '[]', 0]
    )
    return { token, player: publicPlayer(rows[0]) }
  }
  async authenticate(token: string) {
    const { rows } = await this.sql.query(
      'UPDATE players SET seen_at=now() WHERE token_hash=$1 RETURNING *',
      [hash(token)]
    )
    return rows[0] ? publicPlayer(rows[0]) : null
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
  async mutatePlayer<T>(
    id: string,
    fn: (save: PlayerSave, client: SqlClient) => T | Promise<T>
  ): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve()
    const operation = previous
      .catch(() => {})
      .then(async () => {
        const client = this.pool ? await this.pool.connect() : this.sql
        try {
          await client.query('BEGIN')
          const { rows } = await client.query(
            'SELECT * FROM players WHERE id=$1 FOR UPDATE',
            [id]
          )
          if (!rows[0]) throw new Error('player_not_found')
          const save: PlayerSave = publicPlayer(rows[0])
          save.revision += 1
          const result = await fn(save, client)
          for (const quest of save.completed)
            await client.query(
              'INSERT INTO quest_completions(player_id,quest_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
              [id, quest.id]
            )
          await client.query(
            'UPDATE players SET world=$2,quest=$3,completed=$4,reputation=$5,revision=$6,seen_at=now() WHERE id=$1',
            [
              id,
              JSON.stringify(save.world),
              JSON.stringify(save.quest),
              JSON.stringify(save.completed),
              save.reputation,
              save.revision,
            ]
          )
          await client.query('COMMIT')
          return result
        } catch (error) {
          await client.query('ROLLBACK')
          throw error
        } finally {
          if ('release' in client) client.release()
        }
      })
    this.locks.set(id, operation)
    try {
      return await operation
    } finally {
      if (this.locks.get(id) === operation) this.locks.delete(id)
    }
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
  async sweep() {
    const { rows } = await this.sql.query(
      "SELECT id FROM players WHERE seen_at < now()-interval '30 days'"
    )
    await this.sql.query(
      "DELETE FROM players WHERE seen_at < now()-interval '30 days'"
    )
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
    fileURLToPath(new URL('../drizzle', import.meta.url)),
    fileURLToPath(new URL('../../drizzle', import.meta.url)),
  ].find((path) => existsSync(`${path}/meta/_journal.json`))
  if (!migrationsFolder) throw new Error('database_migrations_missing')
  await migrate(drizzle(pool), { migrationsFolder })

  return Object.assign(new GameDb(pool, pool, undefined, barkLimit), { pool })
}
