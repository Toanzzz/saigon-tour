/** Host `.env` for compose.prod.yml: api and postgres secrets, mode 600. */
import { randomBytes } from 'node:crypto'
import { type Host, remote } from './host'
import { ask, askSecret, bad, confirm, fail, ok } from './ui'

export type Origins = { apiUrl: string; clientUrl: string }

const random = () => randomBytes(32).toString('hex')

function parse(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match?.[1]) out[match[1]] = match[2] ?? ''
  }
  return out
}

/** 401/403 means the key is wrong; anything else means Meta accepted it. */
async function verifyMuseKey(key: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.meta.ai/v1/models', {
      headers: { authorization: `Bearer ${key}` },
    })
    return res.status !== 401 && res.status !== 403
  } catch {
    return false
  }
}

async function museKey(
  current: string | undefined
): Promise<{ key: string; verified: boolean }> {
  for (;;) {
    const key =
      (await askSecret(
        `META_MUSE_API_KEY${current ? ' (empty keeps current)' : ''}`
      )) || current
    if (!key) fail('META_MUSE_API_KEY is required')
    if (await verifyMuseKey(key)) {
      ok('META_MUSE_API_KEY accepted by api.meta.ai')
      return { key, verified: true }
    }
    bad('META_MUSE_API_KEY rejected by api.meta.ai (401)')
    if (!confirm('Re-enter it?', true)) return { key, verified: false }
  }
}

export async function writeHostEnv(
  host: Host,
  dir: string,
  origins: Origins,
  force: boolean
) {
  const path = `${dir}/.env`
  const existingText = remote(host, `cat '${path}' 2>/dev/null`).out
  if (
    existingText &&
    !force &&
    !confirm(`${path} exists on ${host.hostname}. Rewrite it?`)
  )
    return 'kept' as const
  const existing = parse(existingText)
  let pg: string | undefined = existing.POSTGRES_PASSWORD
  let auth: string | undefined = existing.BETTER_AUTH_SECRET
  if (
    existingText &&
    confirm(
      'Rotate POSTGRES_PASSWORD and BETTER_AUTH_SECRET? (breaks the existing DB volume and sessions)'
    )
  ) {
    pg = undefined
    auth = undefined
  }
  pg ||= random()
  auth ||= random()
  const muse = await museKey(existing.META_MUSE_API_KEY)
  const id = ask(
    'META_CLIENT_ID (optional, public)',
    existing.META_CLIENT_ID ?? ''
  )
  let secret = ''
  if (id) {
    secret =
      (await askSecret('META_CLIENT_SECRET (empty keeps current)')) ||
      existing.META_CLIENT_SECRET ||
      ''
    if (!secret) fail('META_CLIENT_SECRET is required with META_CLIENT_ID')
  }
  const lines = [
    `POSTGRES_PASSWORD=${pg}`,
    `DATABASE_URL=postgres://saigon:${pg}@postgres:5432/saigon`,
    `META_MUSE_API_KEY=${muse.key}`,
    `BETTER_AUTH_SECRET=${auth}`,
    `PUBLIC_API_URL=${origins.apiUrl}`,
    `CLIENT_URL=${origins.clientUrl}`,
    `CORS_ORIGINS=${origins.clientUrl}`,
    ...(id ? [`META_CLIENT_ID=${id}`, `META_CLIENT_SECRET=${secret}`] : []),
    ...(existing.DIRECTOR_MODE
      ? [`DIRECTOR_MODE=${existing.DIRECTOR_MODE}`]
      : []),
  ]
  const write = remote(
    host,
    `mkdir -p '${dir}' && umask 077 && cat > '${path}' && chmod 600 '${path}'`,
    `${lines.join('\n')}\n`
  )
  if (!write.ok) fail(`writing ${path} failed: ${write.err}`)
  return muse.verified ? ('stored' as const) : ('unverified' as const)
}
