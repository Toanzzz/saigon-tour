import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { CompletedQuestSchema, QuestSchema } from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('../drizzle/0003_agent_quests.sql', import.meta.url),
  'utf8'
)
describe('quest migration', () => {
  it('retains active delivery progress, rewards and legacy completed summaries', async () => {
    const sql = new PGlite()
    try {
      await sql.exec(
        'CREATE TABLE players (quest jsonb, quests_unused text, completed jsonb, world jsonb, created_at timestamptz DEFAULT now(), seen_at timestamptz DEFAULT now())'
      )
      const quest = {
        id: 'hoa-herbs-delivery',
        giverNpcId: 'hoa',
        title: 'Herbs for lunch',
        description: 'Bring herbs to Linh.',
        objective: { type: 'DELIVER', itemId: 'herbs', npcId: 'linh' },
        reward: { currency: 50, itemId: 'postcard', reputation: 1 },
      }
      await sql.query(
        'INSERT INTO players(quest,completed,world) VALUES($1,$2,$3)',
        [
          JSON.stringify(quest),
          JSON.stringify([{ ...quest, id: 'previous-quest' }]),
          JSON.stringify({ deliveredItems: ['herbs:linh'] }),
        ]
      )
      await sql.exec(migration)
      const { rows } = await sql.query<{
        quests: unknown[]
        completed: unknown[]
      }>('SELECT quests,completed FROM players')
      const active = QuestSchema.parse(rows[0]?.quests[0])
      expect(active).toMatchObject({
        id: 'q_legacy_hoa-herbs-delivery',
        status: 'ready',
        progress: [true],
        reward: quest.reward,
      })
      expect(CompletedQuestSchema.parse(rows[0]?.completed[0])).toMatchObject({
        id: 'previous-quest',
        title: quest.title,
        reward: quest.reward,
      })
    } finally {
      await sql.close()
    }
  })
})
