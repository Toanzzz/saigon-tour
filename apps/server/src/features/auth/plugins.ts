import { randomPlayerName } from '@saigon/shared'
import type { AnonymousOptions } from 'better-auth/plugins'
import { anonymous, bearer } from 'better-auth/plugins'

/**
 * The one plugin list shared by the runtime auth and the `auth generate`
 * CLI config, so the generated tables match what the server runs.
 * `bearer` must precede `anonymous` so bearer sessions are visible to it.
 */
export function authPlugins(onLinkAccount?: AnonymousOptions['onLinkAccount']) {
  const plugins: [ReturnType<typeof bearer>, ReturnType<typeof anonymous>] = [
    bearer(),
    anonymous({ generateName: () => randomPlayerName(), onLinkAccount }),
  ]
  return plugins
}
