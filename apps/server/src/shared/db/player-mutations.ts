import { GuestPlayerSchema } from '@saigon/shared'
import type { Pool } from 'pg'
import type { PlayerSave, SqlClient } from './player-save'

/** Sorted database row locks and an in-process queue cover overlapping groups. */
export class PlayerMutations {
  private locks = new Map<string, Promise<unknown>>()
  constructor(
    private readonly sql: SqlClient,
    private readonly pool?: Pool
  ) {}

  async run<T>(
    ids: string[],
    fn: (saves: Map<string, PlayerSave>, client: SqlClient) => T | Promise<T>
  ): Promise<T> {
    const sorted = [...new Set(ids)].sort()
    const keys = this.pool ? sorted : ['single-sql-client']
    const previous = keys.map((id) => this.locks.get(id) ?? Promise.resolve())
    const operation = Promise.all(
      previous.map((pending) => pending.catch(() => {}))
    ).then(async () => {
      const client = this.pool ? await this.pool.connect() : this.sql
      try {
        await client.query('BEGIN')
        const { rows } = await client.query(
          'SELECT * FROM players WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE',
          [sorted]
        )
        const saves = new Map<string, PlayerSave>()
        for (const row of rows) {
          const player = GuestPlayerSchema.parse(row)
          player.revision += 1
          saves.set(player.id, player)
        }
        const result = await fn(saves, client)
        for (const [id, save] of saves) {
          for (const quest of save.completed)
            await client.query(
              'INSERT INTO quest_completions(player_id,quest_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
              [id, quest.id]
            )
          await client.query(
            'UPDATE players SET world=$2,quests=$3,completed=$4,reputation=$5,revision=$6,friendship=$7,unlocks=$8,seen_at=now() WHERE id=$1',
            [
              id,
              JSON.stringify(save.world),
              JSON.stringify(save.quests),
              JSON.stringify(save.completed),
              save.reputation,
              save.revision,
              JSON.stringify(save.friendship),
              JSON.stringify(save.unlocks),
            ]
          )
        }
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        if ('release' in client) client.release()
      }
    })
    for (const key of keys) this.locks.set(key, operation)
    try {
      return await operation
    } finally {
      for (const key of keys)
        if (this.locks.get(key) === operation) this.locks.delete(key)
    }
  }
}
