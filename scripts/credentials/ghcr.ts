import { ghcrLoggedIn, ghcrLogin, type Host } from './host'
import * as ui from './ui'

/** The host pulls the api image; a PAT login is only needed while it is private. */
export async function stepGhcr(target: Host): Promise<string> {
  ui.heading(8, 8, '📦', 'GHCR pull access')
  ui.brief('The host pulls ghcr.io/toanzzz/saigon-tour-api.', [
    { name: 'read:packages', why: 'only needed while the package is private' },
  ])
  if (ghcrLoggedIn(target)) return 'kept (host already logged in)'
  if (!ui.confirm('Log the host into ghcr.io with a read:packages PAT now?'))
    return 'skipped (make the package public after the first push)'
  ui.offerLinks([
    {
      emoji: '🎫',
      label: 'Classic PAT',
      url: 'https://github.com/settings/tokens/new?description=saigon-tour%20ghcr%20pull&scopes=read:packages',
    },
  ])
  const user = ui.ask('GitHub user', 'Toanzzz')
  const pat = await ui.askSecret('PAT (read:packages)')
  return ghcrLogin(target, user, pat)
    ? 'stored (host logged in)'
    : 'unverified (docker login failed)'
}
