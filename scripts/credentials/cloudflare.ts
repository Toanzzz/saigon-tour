/** Cloudflare inference, token template links, and capability probes. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { run } from './shell'
import type { Link, Need } from './ui'

const API = 'https://api.cloudflare.com/client/v4'

export type Permission = { key: string; type: 'read' | 'edit' }

/** A static-asset Worker with no bindings needs only Workers Scripts: Edit. */
export const PERMISSIONS: Permission[] = [
  { key: 'workers_scripts', type: 'edit' },
]

export const NEEDS: Need[] = [
  {
    name: 'Account → Workers Scripts → Edit',
    why: 'wrangler deploy uploads the client assets',
  },
]

export type Account = { id: string; name: string }

/** Worker name from the root wrangler.jsonc (JSONC: strip comments first). */
export function workerName(root: string): string {
  const text = readFileSync(join(root, 'wrangler.jsonc'), 'utf8')
  const json = text
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  return (JSON.parse(json) as { name: string }).name
}

/**
 * Accounts from the local wrangler OAuth login. wrangler prefers an
 * environment CLOUDFLARE_API_TOKEN over OAuth, so strip it for this call.
 */
export function wranglerAccounts(): Account[] {
  const env = { ...process.env }
  delete env.CLOUDFLARE_API_TOKEN
  delete env.CLOUDFLARE_ACCOUNT_ID
  const who = run('bunx', ['wrangler', 'whoami', '--json'], { env })
  const start = who.out.indexOf('{')
  if (!who.ok || start < 0) return []
  try {
    return (
      (JSON.parse(who.out.slice(start)) as { accounts?: Account[] }).accounts ??
      []
    )
  } catch {
    return []
  }
}

function query(name: string): string {
  return [
    `permissionGroupKeys=${encodeURIComponent(JSON.stringify(PERMISSIONS))}`,
    `name=${encodeURIComponent(name)}`,
  ].join('&')
}

/** Dashboard token template URLs, account-owned first. */
export function tokenLinks(name: string, accountId: string): Link[] {
  return [
    {
      emoji: '🏢',
      label: 'Account-owned token',
      url: `https://dash.cloudflare.com/?to=/:account/api-tokens&${query(name)}`,
      hint: 'preferred for CI; needs account Admin',
    },
    {
      emoji: '👤',
      label: 'User-owned token',
      url: `https://dash.cloudflare.com/profile/api-tokens?${query(name)}&accountId=${encodeURIComponent(accountId || '*')}&zoneId=all`,
      hint: 'fallback; tied to your user',
    },
  ]
}

type Call = { ok: boolean; error?: string; code?: number; result?: unknown }

async function get(token: string, path: string): Promise<Call> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    const body = (await res.json()) as {
      success: boolean
      result?: unknown
      errors?: { code?: number; message: string }[]
    }
    if (res.ok && body.success) return { ok: true, result: body.result }
    const code = body.errors?.[0]?.code
    const error =
      body.errors?.map((e) => e.message).join('; ') || res.statusText
    return code === undefined
      ? { ok: false, error }
      : { ok: false, error, code }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export type Probe = { label: string; ok: boolean; detail?: string }

/**
 * Probes capability, not ownership: `/user/tokens/verify` rejects
 * account-owned tokens with 1000, so it is not used here.
 */
export async function verify(
  token: string,
  accountId: string
): Promise<{ probes: Probe[]; subdomain?: string }> {
  const scripts = await get(token, `/accounts/${accountId}/workers/scripts`)
  if (!scripts.ok && (scripts.code === 6003 || scripts.code === 6111)) {
    return {
      probes: [
        {
          label: 'token format',
          ok: false,
          detail: `malformed (${scripts.code}); a truncated paste looks like this`,
        },
      ],
    }
  }
  const sub = await get(token, `/accounts/${accountId}/workers/subdomain`)
  const subdomain = sub.ok
    ? (sub.result as { subdomain?: string } | null)?.subdomain
    : undefined
  return {
    probes: [
      { label: 'Workers Scripts: Edit', ok: scripts.ok, detail: scripts.error },
      {
        label: 'workers.dev subdomain',
        ok: Boolean(subdomain),
        detail: subdomain ?? sub.error ?? 'not registered',
      },
    ],
    subdomain,
  }
}
