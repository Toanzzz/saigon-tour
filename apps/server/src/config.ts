export interface ServerConfig {
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

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const spendLimitUsd = Number(env.META_SPEND_LIMIT_USD ?? 5)
  if (
    !Number.isFinite(spendLimitUsd) ||
    spendLimitUsd < 0 ||
    spendLimitUsd > 150
  ) {
    throw new Error('META_SPEND_LIMIT_USD must be between 0 and 150')
  }
  const apiUrl =
    env.META_API_URL?.trim() || 'https://api.meta.ai/v1/chat/completions'
  if (apiUrl) {
    const parsed = new URL(apiUrl)
    if (
      parsed.protocol !== 'https:' &&
      !['localhost', '127.0.0.1'].includes(parsed.hostname)
    ) {
      throw new Error('META_API_URL must use HTTPS outside localhost')
    }
  }
  return {
    port: Number(env.PORT ?? 58001),
    origins: (
      env.CORS_ORIGINS ?? 'http://localhost:58000,http://127.0.0.1:58000'
    )
      .split(',')
      .map((origin) => origin.trim()),
    apiUrl,
    apiKey: env.META_MUSE_API_KEY?.trim() || env.META_API_KEY?.trim(),
    model: env.META_MODEL?.trim() || 'muse-spark-1.3-contributor',
    timeoutMs: 8000,
    sessionCallLimit: 24,
    globalCallLimit: 500,
    spendLimitUsd,
    production: env.NODE_ENV === 'production',
  }
}

export function isLiveConfigured(config: ServerConfig): boolean {
  return Boolean(config.apiUrl && config.apiKey && config.model)
}
