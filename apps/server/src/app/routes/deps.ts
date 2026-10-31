import type { GuestPlayer } from '@saigon/shared'
import { createFactory } from 'hono/factory'
import type { Auth, AuthSession } from '@/features/auth'
import type { NpcHarness } from '@/features/npc'
import type { GameDb, ServerConfig } from '@/shared'
import type { createRealtime } from '../realtime'

/** Per-request dependencies shared across every route module. */
export interface RouteDeps {
  auth: Auth
  config: ServerConfig
  db: GameDb
  harness: NpcHarness
  realtime: ReturnType<typeof createRealtime>
}

/** Hono environment: `requireAuth` sets the player and auth user. */
export interface Env {
  Variables: { player: GuestPlayer; user: AuthSession['user'] }
}

export const factory = createFactory<Env>()
