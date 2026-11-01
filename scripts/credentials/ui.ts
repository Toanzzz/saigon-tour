/** Terminal helpers for the credentials walkthrough: color, spinner, prompts. */
import { readSync } from 'node:fs'
import { run } from './shell'

const interactive = Boolean(process.stdout.isTTY) && !process.env.CI
const color = interactive && !process.env.NO_COLOR
const codes = {
  dim: '2',
  bold: '1',
  cyan: '36',
  green: '32',
  yellow: '33',
  red: '31',
} as const
type Tone = keyof typeof codes

export const paint = (tone: Tone, text: string) =>
  color ? `\x1b[${codes[tone]}m${text}\x1b[0m` : text

export const blank = () => console.log()
export const info = (text: string) => console.log(`   ${text}`)
export const dim = (text: string) => info(paint('dim', text))
export const warn = (text: string) => info(`${paint('yellow', '!')}  ${text}`)
export const ok = (text: string) => info(`${paint('green', '✓')}  ${text}`)
export const bad = (text: string) => info(`${paint('red', '✗')}  ${text}`)

export function heading(
  index: number,
  total: number,
  emoji: string,
  title: string
) {
  blank()
  console.log(`${emoji}  ${paint('bold', `${index}/${total} ${title}`)}`)
}

export type Need = { name: string; why: string }

/** Prints what a credential is for and what access it must carry. */
export function brief(usedFor: string, needs: Need[] = []) {
  dim(usedFor)
  for (const need of needs)
    info(`${paint('cyan', '•')} ${need.name} ${paint('dim', `— ${need.why}`)}`)
}

export type Link = { emoji: string; label: string; url: string; hint?: string }

export function printLinks(links: Link[]) {
  blank()
  info(paint('bold', 'Create at'))
  for (const link of links) {
    const hint = link.hint ? paint('dim', `  (${link.hint})`) : ''
    info(`${link.emoji}  ${paint('bold', link.label)}${hint}`)
    info(`   ${paint('cyan', link.url)}`)
  }
}

export function offerLinks(links: Link[]) {
  printLinks(links)
  for (const link of links) {
    if (!confirm(`Open ${link.label} in the browser?`)) continue
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open'
    run(opener, [link.url])
    return
  }
}

let stopActive: (() => void) | undefined

export async function spin<T>(
  label: string,
  work: () => Promise<T>
): Promise<T> {
  if (!interactive) return work()
  const frames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  let frame = 0
  const draw = () =>
    process.stdout.write(
      `\r\x1b[2K   ${paint('cyan', frames[frame++ % 10] ?? '')}  ${paint('dim', label)}`
    )
  process.stdout.write('\x1b[?25l')
  draw()
  const timer = setInterval(draw, 80)
  stopActive = () => {
    clearInterval(timer)
    process.stdout.write('\r\x1b[2K\x1b[?25h')
    stopActive = undefined
  }
  try {
    return await work()
  } finally {
    stopActive?.()
  }
}

process.on('exit', () => stopActive?.())

export function releaseStdin() {
  stopActive?.()
  const stdin = process.stdin
  try {
    stdin.removeAllListeners('data')
    if (stdin.isTTY) stdin.setRawMode(false)
    stdin.pause()
    stdin.unref()
  } catch {
    // stdin already closed
  }
}

export function fail(message: string): never {
  blank()
  bad(paint('red', message))
  releaseStdin()
  process.exit(1)
}

function cooked() {
  if (process.stdin.isTTY) process.stdin.setRawMode(false)
}

/**
 * Reads one line from fd 0. Bun's `prompt()` returns null for both a blank
 * line and EOF, so it cannot tell "accept default" from "input closed".
 */
function readLine(): string | null {
  const byte = Buffer.alloc(1)
  const bytes: number[] = []
  for (;;) {
    let n: number
    try {
      n = readSync(0, byte, 0, 1, null)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EAGAIN') continue
      throw error
    }
    if (n === 0)
      return bytes.length ? Buffer.from(bytes).toString('utf8') : null
    if (byte[0] === 0x0a) return Buffer.from(bytes).toString('utf8')
    bytes.push(byte[0] as number)
  }
}

function line(label: string): string {
  cooked()
  process.stdout.write(`${label} `)
  const answer = readLine()
  // EOF must never count as an accepted default.
  if (answer === null) fail('Input closed; nothing further was changed.')
  return answer.trim()
}

export function ask(label: string, fallback = ''): string {
  const hint = fallback ? paint('dim', ` [${fallback}]`) : ''
  return line(`   ${paint('cyan', '▸')}  ${label}${hint}:`) || fallback
}

export function confirm(label: string, defaultYes = false): boolean {
  const answer = line(
    `   ${paint('cyan', '?')}  ${label} ${paint('dim', defaultYes ? '[Y/n]' : '[y/N]')}`
  )
  return answer === '' ? defaultYes : /^y(es)?$/i.test(answer)
}

export function choose(label: string, options: string[]): number {
  for (const [i, option] of options.entries())
    info(`${paint('cyan', String(i + 1))}. ${option}`)
  const index = Number(ask(`${label} [1-${options.length}]`)) - 1
  if (!Number.isInteger(index) || !options[index])
    fail(`Expected a number from 1 to ${options.length}.`)
  return index
}

/** Reads a secret, echoing one star per character (paste included). */
export function askSecret(label: string): Promise<string> {
  const text = `   ${paint('cyan', '▸')}  ${label}: `
  const stdin = process.stdin
  if (!stdin.isTTY) return Promise.resolve(line(text))
  return new Promise((resolve) => {
    let value = ''
    let escaping = false
    process.stdout.write(text)
    stdin.setRawMode(true)
    stdin.setEncoding('utf8')
    stdin.resume()
    const done = () => {
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      process.stdout.write('\n')
    }
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (escaping) {
          escaping = char === '[' || char === 'O' || /[\d;]/.test(char)
        } else if (char === '\u001b') {
          escaping = true
        } else if (char === '\r' || char === '\n') {
          done()
          resolve(value.trim())
          return
        } else if (char === '\u0003' || char === '\u0004') {
          done()
          fail('Cancelled; nothing further was changed.')
        } else if (char === '\u007f' || char === '\b') {
          if (value) process.stdout.write('\b \b')
          value = value.slice(0, -1)
        } else if (char === '\u0015') {
          process.stdout.write('\b \b'.repeat(value.length))
          value = ''
        } else if (char >= ' ') {
          value += char
          process.stdout.write('*')
        }
      }
    }
    stdin.on('data', onData)
  })
}
