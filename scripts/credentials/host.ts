/** SSH host access for the deploy job: target, deploy key, pinned host keys. */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run } from './shell'
import { fail } from './ui'

export type Host = { alias: string; hostname: string; user: string }

export function sshConfig(alias: string): { hostname?: string; user?: string } {
  const res = run('ssh', ['-G', alias])
  const field = (key: string) =>
    res.out.match(new RegExp(`^${key} (.+)$`, 'm'))?.[1]
  return { hostname: field('hostname'), user: field('user') }
}

const target = (host: Host) => `${host.user}@${host.hostname}`

/** Runs a command on the host as the operator (BatchMode: no password prompts). */
export function remote(host: Host, command: string, input?: string) {
  return run('ssh', ['-T', '-o', 'BatchMode=yes', target(host), command], {
    input,
  })
}

export function checkHost(host: Host): string | undefined {
  const groups = remote(host, 'id -nG')
  if (!groups.ok) return `cannot ssh to ${target(host)}: ${groups.err}`
  if (!groups.out.split(/\s+/).includes('docker'))
    return `${host.user} is not in the docker group`
  if (!remote(host, 'docker network inspect edge >/dev/null').ok)
    return "docker network 'edge' is missing"
  return undefined
}

/** Generates a fresh ed25519 key, installs it, and proves it logs in. */
export function mintDeployKey(host: Host): string {
  const dir = mkdtempSync(join(tmpdir(), 'saigon-deploy-'))
  try {
    const key = join(dir, 'id_deploy')
    if (
      !run('ssh-keygen', [
        '-q',
        '-t',
        'ed25519',
        '-N',
        '',
        '-C',
        'saigon-tour-deploy',
        '-f',
        key,
      ]).ok
    )
      fail('ssh-keygen failed')
    if (
      !run('ssh-copy-id', ['-i', `${key}.pub`, target(host)], { inherit: true })
        .ok
    )
      fail('ssh-copy-id failed')
    const login = run('ssh', [
      '-T',
      '-o',
      'BatchMode=yes',
      '-o',
      'IdentitiesOnly=yes',
      '-i',
      key,
      target(host),
      'true',
    ])
    if (!login.ok) fail(`new deploy key does not log in: ${login.err}`)
    return readFileSync(key, 'utf8')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function scanHostKeys(hostname: string): {
  keys: string
  fingerprints: string
} {
  const keys = run('ssh-keyscan', ['-H', hostname]).out
  if (!keys) fail(`ssh-keyscan returned nothing for ${hostname}`)
  const fingerprints = run('ssh-keygen', ['-lf', '-'], { input: keys }).out
  return { keys, fingerprints }
}

export function ghcrLoggedIn(host: Host): boolean {
  return remote(host, 'grep -q ghcr.io ~/.docker/config.json 2>/dev/null').ok
}

export function ghcrLogin(host: Host, user: string, pat: string): boolean {
  return remote(
    host,
    `docker login ghcr.io -u '${user.replace(/'/g, '')}' --password-stdin`,
    pat
  ).ok
}
