const commands = [
  ['bun', 'run', '--filter', '@saigon/client', 'dev'],
  ['bun', '--env-file=.env', 'run', '--filter', '@saigon/server', 'dev'],
]
const children = commands.map((cmd) =>
  Bun.spawn(cmd, { stdout: 'inherit', stderr: 'inherit', env: process.env })
)
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    for (const child of children) child.kill()
    process.exit(0)
  })
}
await Promise.race(children.map((child) => child.exited))
for (const child of children) child.kill()
