import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import type { GameDb, ServerConfig } from '@/shared'
import * as schema from '@/shared/db/schema'
import { authPlugins } from './plugins'

export { authPlugins } from './plugins'
/** Any Drizzle Postgres database (node-postgres in production, PGlite in tests). */
export type AuthDatabase = Parameters<typeof drizzleAdapter>[0]

/** Where the Meta OAuth round trip returns after sign-in. */
export const AUTH_BASE_PATH = '/auth'

/**
 * Better Auth on the game database. Anonymous play is the default identity;
 * Meta (Facebook Login) links that identity so progress follows the account.
 */
export function createAuth(
  config: ServerConfig,
  orm: AuthDatabase,
  db: GameDb
) {
  return betterAuth({
    appName: 'Sài Gòn',
    secret: config.authSecret,
    baseURL: `${config.publicApiUrl}${AUTH_BASE_PATH}`,
    database: drizzleAdapter(orm, { provider: 'pg', schema }),
    trustedOrigins: [...config.origins, config.clientUrl],
    session: {
      expiresIn: 60 * 60 * 24 * 90,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: config.production ? 'none' : 'lax',
        secure: config.production,
      },
    },
    socialProviders: config.meta
      ? {
          facebook: {
            clientId: config.meta.clientId,
            clientSecret: config.meta.clientSecret,
            mapProfileToUser: (profile) => ({
              email:
                profile.email ||
                `${'id' in profile ? profile.id : profile.sub}@facebook.saigon.invalid`,
            }),
          },
        }
      : undefined,
    plugins: authPlugins(async ({ anonymousUser, newUser }) => {
      await linkGuestSave(db, anonymousUser.user.id, newUser.user.id)
    }),
  })
}

/**
 * Anonymous → Meta link policy. An account that already has a save keeps it
 * (the guest journey is dropped with the anonymous user); a new account
 * inherits the guest's save.
 */
export async function linkGuestSave(
  db: Pick<GameDb, 'playerIdForUser' | 'transferPlayer'>,
  anonymousUserId: string,
  accountUserId: string
) {
  if (await db.playerIdForUser(accountUserId)) return 'kept-account' as const
  await db.transferPlayer(anonymousUserId, accountUserId)
  return 'inherited-guest' as const
}

export type Auth = ReturnType<typeof createAuth>

/**
 * The API may sit behind a path prefix (the dev proxy strips `/api`), so map
 * the request back onto the public auth URL Better Auth routes and signs.
 */
export function authRequest(config: ServerConfig, request: Request) {
  const prefix = new URL(config.publicApiUrl).pathname.replace(/\/+$/, '')
  const url = new URL(request.url)
  if (!prefix || url.pathname.startsWith(`${prefix}${AUTH_BASE_PATH}`))
    return request
  url.pathname = `${prefix}${url.pathname}`
  return new Request(url, request)
}
export type AuthSession = NonNullable<
  Awaited<ReturnType<Auth['api']['getSession']>>
>
