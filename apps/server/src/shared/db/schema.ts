import type {
  CompletedQuest,
  FriendshipMap,
  Quest,
  Unlocks,
  WorldState,
} from '@saigon/shared'
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
import { user } from './auth-schema'

export * from './auth-schema'

export const players = pgTable('players', {
  friendship: jsonb().$type<FriendshipMap>().notNull().default({}),
  revision: integer().notNull().default(0),
  id: uuid().primaryKey(),
  tokenHash: text('token_hash').unique(),
  userId: text('user_id')
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  body: text().notNull().default('man'),
  color: text().notNull(),
  world: jsonb().$type<WorldState>().notNull(),
  quests: jsonb().$type<Quest[]>().notNull().default([]),
  completed: jsonb().$type<CompletedQuest[]>().notNull(),
  reputation: integer().notNull().default(0),
  unlocks: jsonb()
    .$type<Unlocks>()
    .notNull()
    .default({ owned: [], equipped: {} }),
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
export const coinPickups = pgTable(
  'coin_pickups',
  {
    playerId: uuid('player_id')
      .references(() => players.id, { onDelete: 'cascade' })
      .notNull(),
    coinId: text('coin_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.coinId] })]
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
  directors: integer().notNull().default(0),
})
export const npcGreetings = pgTable('npc_greetings', {
  key: text().primaryKey(),
  reply: text().notNull(),
  source: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})
