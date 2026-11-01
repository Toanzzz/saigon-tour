type Level = 'info' | 'warn' | 'error'

interface LogEntry {
  _timestamp: string
  level: Level
  event: string
  service_name: string
  trace_id: string
  span_id: string
  message: string
}

const SERVICE_NAME = 'saigon-tour-api'

const COLOR = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  event: '\x1b[36m',
} as const

// Human-readable color output for local dev; structured JSON in production and
// under tests. NODE_ENV drives the choice (TTY detection is unreliable under
// `concurrently`, which pipes child stdout). NO_COLOR / FORCE_COLOR=0 opt out.
const isDev =
  process.env.NODE_ENV !== 'production' && process.env.VITEST == null
const colorDisabled =
  process.env.NO_COLOR != null || process.env.FORCE_COLOR === '0'
const pretty = isDev && !colorDisabled

// Local dev shows the device-local wall-clock time (hh:mm); the JSON
// `_timestamp` stays full UTC ISO.
function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function format(entry: LogEntry): string {
  if (!pretty) return JSON.stringify(entry)
  const time = `${COLOR.dim}${shortTime(entry._timestamp)}${COLOR.reset}`
  const tag = `${COLOR[entry.level]}${entry.level.toUpperCase().padEnd(5)}${COLOR.reset}`
  return `${time} ${tag} ${COLOR.event}${entry.event}${COLOR.reset} ${entry.message}`
}

export function log(
  event: string,
  message: string,
  level: Level = 'info'
): void {
  process.stdout.write(
    `${format({
      _timestamp: new Date().toISOString(),
      level,
      event,
      service_name: SERVICE_NAME,
      trace_id: '',
      span_id: '',
      message,
    })}\n`
  )
}
