import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { authPlugins } from './plugins'

/** Config read only by `auth generate`; never imported at runtime. */
export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: 'pg' }),
  plugins: authPlugins(),
})
