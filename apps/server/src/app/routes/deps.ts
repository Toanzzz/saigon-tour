import type { GuestPlayer } from '@saigon/shared'
import { createFactory } from 'hono/factory'
import type { NpcHarness } from '@/features/npc'
import type { GameDb, ServerConfig } from '@/shared'
import type { createRealtime } from '../realtime'

/** Per-request dependencies shared across every route module. */
export interface RouteDeps {
  config: ServerConfig
  db: GameDb
  harness: NpcHarness
  realtime: ReturnType<typeof createRealtime>
}

/** Hono environment: `player` is set by `requireAuth` on protected routes. */
export interface Env {
  Variables: { player: GuestPlayer }
}

export const factory = createFactory<Env>()
