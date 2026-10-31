import type { Quest, WorldState } from '@saigon/shared'
import {
  integer,
  jsonb,
  numeric,
  pgTable,
  // biome-ignore lint/suspicious/noDeprecatedImports: we call the current primaryKey({ columns }) object overload, not the deprecated positional one
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const players = pgTable('players', {
  revision: integer().notNull().default(0),
  id: uuid().primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  name: text().notNull(),
  color: text().notNull(),
  world: jsonb().$type<WorldState>().notNull(),
  quest: jsonb().$type<Quest | null>(),
  completed: jsonb().$type<Quest[]>().notNull(),
  reputation: integer().notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  seenAt: timestamp('seen_at', { withTimezone: true }).defaultNow().notNull(),
})
export const questCompletions = pgTable(
  'quest_completions',
  {
    playerId: uuid('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    questId: text('quest_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.questId] })]
)
export const npcFacts = pgTable(
  'npc_facts',
  {
    playerId: uuid('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    npcId: text('npc_id').notNull(),
    fact: text().notNull(),
    importance: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.npcId, t.fact] })]
)
export const modelSpend = pgTable('model_spend', {
  day: text().primaryKey(),
  calls: integer().notNull().default(0),
  reservedUsd: numeric('reserved_usd').notNull().default('0'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  barks: integer().notNull().default(0),
})
export const npcGreetings = pgTable('npc_greetings', {
  key: text().primaryKey(),
  reply: text().notNull(),
  source: text().notNull(),
})
