import { log } from './logger'

export interface ServerConfig {
  databaseUrl: string
  barkDailyLimit: number
  port: number
  origins: string[]
  apiUrl?: string
  apiKey?: string
  model?: string
  timeoutMs: number
  sessionCallLimit: number
  globalCallLimit: number
  spendLimitUsd: number
  production: boolean
}

/**
 * Zero-config by default: every value falls back to a working local default.
 * Each fallback logs a warning so operators can see what was defaulted.
 * In production, required secrets must be provided or startup fails fast.
 */
export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const production = env.NODE_ENV === 'production'
  const warnFallback = (name: string, used: string) => {
    if (!env.VITEST)
      log('config_fallback', `${name} not set; using default (${used})`, 'warn')
  }
  const fallback = (name: string, value: string | undefined, def: string) => {
    const set = value?.trim()
    if (set) return set
    warnFallback(name, def)
    return def
  }

  const apiKey = env.META_MUSE_API_KEY?.trim() || env.META_API_KEY?.trim()
  if (production) {
    const missing = [
      !env.DATABASE_URL && 'DATABASE_URL',
      !apiKey && 'META_MUSE_API_KEY',
    ].filter(Boolean)
    if (missing.length > 0)
      throw new Error(
        `Missing required secrets in production: ${missing.join(', ')}`
      )
  }
  if (!apiKey) warnFallback('META_MUSE_API_KEY', 'offline guide')

  const spendLimitUsd = Number(env.META_SPEND_LIMIT_USD ?? 5)
  if (env.META_SPEND_LIMIT_USD === undefined)
    warnFallback('META_SPEND_LIMIT_USD', '5')
  if (
    !Number.isFinite(spendLimitUsd) ||
    spendLimitUsd < 0 ||
    spendLimitUsd > 150
  ) {
    throw new Error('META_SPEND_LIMIT_USD must be between 0 and 150')
  }

  const apiUrl = fallback(
    'META_API_URL',
    env.META_API_URL,
    'https://api.meta.ai/v1/chat/completions'
  )
  const parsed = new URL(apiUrl)
  if (
    parsed.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(parsed.hostname)
  ) {
    throw new Error('META_API_URL must use HTTPS outside localhost')
  }

  const barkDailyLimit = Number(env.NPC_BARK_DAILY_LIMIT ?? 200)
  if (env.NPC_BARK_DAILY_LIMIT === undefined)
    warnFallback('NPC_BARK_DAILY_LIMIT', '200')
  const port = Number(env.PORT ?? 58001)
  if (env.PORT === undefined) warnFallback('PORT', '58001')

  return {
    databaseUrl: fallback(
      'DATABASE_URL',
      env.DATABASE_URL,
      'postgres://saigon:saigon@127.0.0.1:58002/saigon'
    ),
    barkDailyLimit,
    port,
    origins: fallback(
      'CORS_ORIGINS',
      env.CORS_ORIGINS,
      'http://localhost:58000,http://127.0.0.1:58000'
    )
      .split(',')
      .map((origin) => origin.trim()),
    apiUrl,
    apiKey,
    model: fallback('META_MODEL', env.META_MODEL, 'muse-spark-1.3-contributor'),
    timeoutMs: 8000,
    sessionCallLimit: 24,
    globalCallLimit: 500,
    spendLimitUsd,
    production,
  }
}

export function isLiveConfigured(config: ServerConfig): boolean {
  return Boolean(config.apiUrl && config.apiKey && config.model)
}
