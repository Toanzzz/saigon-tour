import { log } from './logger'

export interface ServerConfig {
  databaseUrl: string
  barkDailyLimit: number
  directorDailyLimit: number
  directorMode: 'live' | 'scripted' | 'off'
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
  authSecret: string
  /** Browser-visible API base; Better Auth lives at `${publicApiUrl}/auth`. */
  publicApiUrl: string
  clientUrl: string
  meta?: { clientId: string; clientSecret: string }
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
  const authSecret = env.BETTER_AUTH_SECRET?.trim()
  if (production && (!authSecret || authSecret.length < 32))
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters')
  const metaId = env.META_CLIENT_ID?.trim()
  const metaSecret = env.META_CLIENT_SECRET?.trim()
  if (Boolean(metaId) !== Boolean(metaSecret))
    throw new Error(
      'Set both META_CLIENT_ID and META_CLIENT_SECRET, or neither'
    )
  if (!metaId) warnFallback('META_CLIENT_ID', 'Meta login disabled')

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

  const directorMode = env.DIRECTOR_MODE ?? 'live'
  if (!['live', 'scripted', 'off'].includes(directorMode))
    throw new Error('DIRECTOR_MODE must be live, scripted, or off')
  const directorDailyLimit = Number(env.DIRECTOR_DAILY_LIMIT ?? 200)
  if (
    !Number.isInteger(directorDailyLimit) ||
    directorDailyLimit < 0 ||
    directorDailyLimit > 10000
  )
    throw new Error('DIRECTOR_DAILY_LIMIT must be between 0 and 10000')

  return {
    databaseUrl: fallback(
      'DATABASE_URL',
      env.DATABASE_URL,
      'postgres://saigon:saigon@127.0.0.1:58002/saigon'
    ),
    barkDailyLimit,
    directorDailyLimit,
    directorMode: directorMode as ServerConfig['directorMode'],
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
    // Per model call; the current provider needs ~8–9s for a tool-enabled NPC turn.
    timeoutMs: 15000,
    sessionCallLimit: 24,
    globalCallLimit: 500,
    spendLimitUsd,
    production,
    authSecret:
      authSecret ??
      fallback(
        'BETTER_AUTH_SECRET',
        undefined,
        'saigon-tour-local-development-secret'
      ),
    publicApiUrl: fallback(
      'PUBLIC_API_URL',
      env.PUBLIC_API_URL,
      'http://127.0.0.1:58000/api'
    ).replace(/\/+$/, ''),
    clientUrl: fallback('CLIENT_URL', env.CLIENT_URL, 'http://127.0.0.1:58000'),
    meta:
      metaId && metaSecret
        ? { clientId: metaId, clientSecret: metaSecret }
        : undefined,
  }
}

export function isLiveConfigured(config: ServerConfig): boolean {
  return Boolean(config.apiUrl && config.apiKey && config.model)
}
