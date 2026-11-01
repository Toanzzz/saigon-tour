import { run } from './shell'
import { fail } from './ui'

export type Outcome = 'stored' | 'unverified' | 'kept' | 'skipped' | 'default'

/** GitHub Actions secrets and variables for one repository. */
export class Repo {
  readonly secrets: Set<string>
  readonly vars: Set<string>

  constructor(readonly name: string) {
    this.secrets = new Set(list('secret', name))
    this.vars = new Set(list('variable', name))
  }

  static infer(): string | undefined {
    const view = run('gh', [
      'repo',
      'view',
      '--json',
      'nameWithOwner',
      '-q',
      '.nameWithOwner',
    ])
    return view.ok && view.out ? view.out : undefined
  }

  /** Value travels on stdin; `gh secret set` without `--body` reads it there. */
  setSecret(key: string, value: string) {
    const res = run('gh', ['secret', 'set', key, '-R', this.name], {
      input: value,
    })
    if (!res.ok) fail(`gh secret set ${key} failed: ${res.err}`)
    this.secrets.add(key)
  }

  setVar(key: string, value: string) {
    const res = run('gh', ['variable', 'set', key, '-R', this.name], {
      input: value,
    })
    if (!res.ok) fail(`gh variable set ${key} failed: ${res.err}`)
    this.vars.add(key)
  }

  varValue(key: string): string | undefined {
    const res = run('gh', ['variable', 'get', key, '-R', this.name])
    return res.ok && res.out ? res.out : undefined
  }
}

function list(kind: 'secret' | 'variable', repo: string): string[] {
  const res = run('gh', [
    kind,
    'list',
    '-R',
    repo,
    '--json',
    'name',
    '-q',
    '.[].name',
  ])
  if (!res.ok) fail(`cannot list ${kind}s on ${repo}: ${res.err}`)
  return res.out.split('\n').filter(Boolean)
}
