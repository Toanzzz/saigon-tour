import { spawnSync } from 'node:child_process'

export type Run = { ok: boolean; code: number; out: string; err: string }

/** Runs a command without a shell; secrets go through `input`, never argv. */
export function run(
  cmd: string,
  args: string[],
  opts: { input?: string; env?: NodeJS.ProcessEnv; inherit?: boolean } = {}
): Run {
  const result = spawnSync(cmd, args, {
    input: opts.input,
    env: opts.env ?? process.env,
    encoding: 'utf8',
    stdio: opts.inherit ? 'inherit' : ['pipe', 'pipe', 'pipe'],
  })
  return {
    ok: result.status === 0,
    code: result.status ?? -1,
    out: (result.stdout ?? '').trim(),
    err: (result.stderr ?? '').trim(),
  }
}

export const has = (cmd: string) =>
  run('sh', ['-c', 'command -v "$1"', 'sh', cmd]).ok
