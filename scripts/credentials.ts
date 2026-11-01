#!/usr/bin/env bun
/**
 * Guided credentials for .github/workflows/deploy.yml.
 *
 * Infers what local CLIs know (gh, ssh config, wrangler login), briefs each
 * value's purpose and access, prompts for the rest, verifies against the API
 * that consumes it, then stores it: GitHub secrets/vars and the host `.env`.
 * Safe to re-run; existing values are kept unless you choose to re-enter.
 *
 *   bun run credentials [--host t-oracle] [--force]
 */
import { join } from 'node:path'
import * as cf from './credentials/cloudflare'
import { stepGhcr } from './credentials/ghcr'
import { type Outcome, Repo } from './credentials/github'
import * as host from './credentials/host'
import { writeHostEnv } from './credentials/host-env'
import { has } from './credentials/shell'
import * as ui from './credentials/ui'

const ROOT = join(import.meta.dirname, '..')
const DEFAULT_REPO = 'Toanzzz/saigon-tour'
const DEFAULT_DIR = 'apps/saigon-tour'
const DEFAULT_API_URL = 'https://saigon-api.toan.io'
const TOTAL = 8

const args = process.argv.slice(2)
const force = args.includes('--force')
const hostFlag = args.indexOf('--host')
if (args.includes('-h') || args.includes('--help')) {
  console.log('usage: bun run credentials [--host <ssh alias>] [--force]')
  process.exit(0)
}

const report: [string, Outcome | string][] = []
const note = (key: string, outcome: Outcome | string) => {
  report.push([key, outcome])
  ui.dim(`${key}: ${outcome}`)
}

/** Existing secret → keep unless forced or the operator opts to re-enter. */
function wantSecret(repo: Repo, key: string): boolean {
  if (force || !repo.secrets.has(key)) return true
  if (ui.confirm(`${key} is already set. Re-enter it?`)) return true
  note(key, 'kept')
  return false
}

function preflight(): Repo {
  for (const cmd of [
    'gh',
    'ssh',
    'ssh-keygen',
    'ssh-keyscan',
    'ssh-copy-id',
    'bunx',
  ])
    if (!has(cmd)) ui.fail(`missing command: ${cmd}`)
  const name = Repo.infer()
  if (!name) ui.warn(`gh repo view failed; using ${DEFAULT_REPO}`)
  return new Repo(name ?? DEFAULT_REPO)
}

function stepHost(repo: Repo): host.Host {
  ui.heading(1, TOTAL, '🖥️', 'SSH host')
  ui.brief(
    'CI connects here to pull the api image and recreate its container.',
    [
      {
        name: 'docker group',
        why: 'the deploy user runs docker compose without sudo',
      },
      { name: "network 'edge'", why: 'Caddy reaches saigon-api:58001 on it' },
    ]
  )
  const alias = ui.ask(
    'SSH alias',
    hostFlag >= 0 ? (args[hostFlag + 1] ?? '') : 't-oracle'
  )
  const inferred = host.sshConfig(alias)
  const target: host.Host = {
    alias,
    hostname: ui.ask('Hostname', inferred.hostname ?? ''),
    user: ui.ask('User', inferred.user ?? ''),
  }
  const problem = host.checkHost(target)
  if (problem) ui.fail(problem)
  ui.ok(
    `${target.user}@${target.hostname} reachable, docker and edge network present`
  )
  for (const [key, value] of [
    ['DEPLOY_HOST', target.hostname],
    ['DEPLOY_USER', target.user],
  ] as const) {
    if (!wantSecret(repo, key)) continue
    repo.setSecret(key, value)
    note(key, 'stored')
  }
  return target
}

function stepKey(repo: Repo, target: host.Host) {
  ui.heading(2, TOTAL, '🔑', 'Deploy key')
  ui.brief(
    'A dedicated ed25519 key that only CI holds; installed in authorized_keys.'
  )
  if (!wantSecret(repo, 'DEPLOY_SSH_KEY')) return
  repo.setSecret('DEPLOY_SSH_KEY', host.mintDeployKey(target))
  note('DEPLOY_SSH_KEY', 'stored')
}

function stepKnownHosts(repo: Repo, target: host.Host) {
  ui.heading(3, TOTAL, '📌', 'Known hosts')
  ui.brief('Pins the host key so CI cannot be redirected to another machine.')
  if (!wantSecret(repo, 'DEPLOY_KNOWN_HOSTS')) return
  const { keys, fingerprints } = host.scanHostKeys(target.hostname)
  for (const line of fingerprints.split('\n')) ui.info(line)
  if (!ui.confirm('Do these fingerprints match the host?'))
    ui.fail('host key not confirmed')
  repo.setSecret('DEPLOY_KNOWN_HOSTS', keys)
  note('DEPLOY_KNOWN_HOSTS', 'stored')
}

function stepDir(repo: Repo): string {
  ui.heading(4, TOTAL, '📁', 'Deploy directory')
  ui.brief('Holds compose.prod.yml and .env, relative to $HOME on the host.')
  const dir = ui.ask('Directory', DEFAULT_DIR)
  if (dir === DEFAULT_DIR) note('DEPLOY_DIR', 'default')
  else if (wantSecret(repo, 'DEPLOY_DIR')) {
    repo.setSecret('DEPLOY_DIR', dir)
    note('DEPLOY_DIR', 'stored')
  }
  return dir
}

async function pickAccount(): Promise<string> {
  const preset = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  if (preset) {
    ui.dim(`account from environment CLOUDFLARE_ACCOUNT_ID: ${preset}`)
    return ui.ask('CLOUDFLARE_ACCOUNT_ID', preset)
  }
  const accounts = await ui.spin('Reading wrangler login…', async () =>
    cf.wranglerAccounts()
  )
  if (accounts.length === 0) {
    ui.warn(
      'wrangler is not logged in (bunx wrangler login); enter the account id'
    )
    return ui.ask('CLOUDFLARE_ACCOUNT_ID')
  }
  const index =
    accounts.length === 1
      ? 0
      : ui.choose(
          'Cloudflare account',
          accounts.map((a) => `${a.name} ${ui.paint('dim', a.id)}`)
        )
  const account = accounts[index] as cf.Account
  ui.dim(`account from wrangler whoami: ${account.name}`)
  return ui.ask('CLOUDFLARE_ACCOUNT_ID', account.id)
}

async function stepCloudflare(repo: Repo): Promise<string | undefined> {
  ui.heading(5, TOTAL, '☁️', 'Cloudflare')
  const worker = cf.workerName(ROOT)
  ui.brief(
    `CI runs wrangler deploy for the static client Worker '${worker}'.`,
    cf.NEEDS
  )
  const account = await pickAccount()
  if (!account) ui.fail('CLOUDFLARE_ACCOUNT_ID is required')
  if (wantSecret(repo, 'CLOUDFLARE_ACCOUNT_ID')) {
    repo.setSecret('CLOUDFLARE_ACCOUNT_ID', account)
    note('CLOUDFLARE_ACCOUNT_ID', 'stored')
  }
  if (!wantSecret(repo, 'CLOUDFLARE_API_TOKEN')) return undefined

  let token = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? ''
  if (token) {
    ui.warn(
      'environment CLOUDFLARE_API_TOKEN found; use it only if it carries the access above'
    )
    if (!ui.confirm('Use the inferred token?')) token = ''
  }
  for (;;) {
    if (!token) {
      ui.dim(
        'wrangler OAuth login is not a deploy token; mint a dedicated one.'
      )
      ui.offerLinks(cf.tokenLinks(`${worker} deploy`, account))
      token = await ui.askSecret('CLOUDFLARE_API_TOKEN')
      if (!token) ui.fail('CLOUDFLARE_API_TOKEN is required')
    }
    const result = await ui.spin('Verifying token…', () =>
      cf.verify(token, account)
    )
    for (const probe of result.probes) {
      const line = `${probe.label}${probe.detail ? ui.paint('dim', `  ${probe.detail}`) : ''}`
      probe.ok ? ui.ok(line) : ui.bad(line)
    }
    const scriptsOk =
      result.probes[0]?.label === 'Workers Scripts: Edit' && result.probes[0].ok
    if (
      scriptsOk ||
      !ui.confirm('Verification failed. Re-enter the token?', true)
    ) {
      repo.setSecret('CLOUDFLARE_API_TOKEN', token)
      note('CLOUDFLARE_API_TOKEN', scriptsOk ? 'stored' : 'unverified')
      return result.subdomain
    }
    token = ''
  }
}

function stepVars(
  repo: Repo,
  subdomain: string | undefined
): { apiUrl: string; clientUrl: string } {
  ui.heading(6, TOTAL, '🌐', 'Public origins')
  ui.brief(
    'API_URL is baked into the client build; both origins go into the api .env.'
  )
  const current = repo.vars.has('API_URL')
    ? repo.varValue('API_URL')
    : undefined
  const apiUrl = ui.ask('API_URL', current ?? DEFAULT_API_URL)
  if (apiUrl !== current) {
    repo.setVar('API_URL', apiUrl)
    note('API_URL', 'stored')
  } else note('API_URL', 'kept')
  const sub = ui.ask('workers.dev subdomain', subdomain ?? '')
  const clientUrl = ui.ask(
    'CLIENT_URL',
    sub ? `https://${cf.workerName(ROOT)}.${sub}.workers.dev` : ''
  )
  if (!clientUrl) ui.fail('CLIENT_URL is required')
  return { apiUrl, clientUrl }
}

function summary(origins: { apiUrl: string }, target: host.Host) {
  const domain = origins.apiUrl.replace(/^https:\/\//, '')
  ui.blank()
  console.log(`🧾  ${ui.paint('bold', 'Summary')}`)
  for (const [key, outcome] of report) ui.info(`${key.padEnd(24)} ${outcome}`)
  ui.blank()
  ui.info(ui.paint('bold', 'Remaining manual steps'))
  ui.info(
    `1. Caddy (infra hosts/${target.alias}/caddy/Caddyfile), then mise run host:sync-caddy ${target.alias}:`
  )
  ui.info(`     ${domain} { reverse_proxy saigon-api:58001 }`)
  ui.info(`2. DNS: point ${domain} at ${target.hostname}.`)
  ui.info(
    `3. Meta login (if enabled): register redirect ${origins.apiUrl}/auth/callback/facebook`
  )
}

async function main() {
  const repo = preflight()
  ui.dim(`repository: ${repo.name}`)
  const target = stepHost(repo)
  stepKey(repo, target)
  stepKnownHosts(repo, target)
  const dir = stepDir(repo)
  const subdomain = await stepCloudflare(repo)
  const origins = stepVars(repo, subdomain)
  ui.heading(7, TOTAL, '🔐', 'Host .env')
  ui.brief(
    `api and postgres secrets at ${target.hostname}:${dir}/.env (mode 600).`,
    [
      { name: 'META_MUSE_API_KEY', why: 'NPC and director model calls' },
      { name: 'META_CLIENT_ID/SECRET', why: 'optional Facebook Login' },
    ]
  )
  note('.env', await writeHostEnv(target, dir, origins, force))
  note('GHCR', await stepGhcr(target))
  summary(origins, target)
  ui.releaseStdin()
}

await main()
