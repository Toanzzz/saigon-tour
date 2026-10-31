import { describe, expect, it, vi } from 'vitest'
import { isLiveConfigured, readConfig } from '@/shared'

describe('config', () => {
  it('is zero-config with working defaults and no env', () => {
    const config = readConfig({})
    expect(config.port).toBe(58001)
    expect(config.databaseUrl).toContain('127.0.0.1:58002')
    expect(config.origins).toContain('http://127.0.0.1:58000')
    expect(config.model).toBe('muse-spark-1.3-contributor')
    expect(config.production).toBe(false)
    expect(config.apiKey).toBeUndefined()
    expect(isLiveConfigured(config)).toBe(false)
  })

  it('runs keyless in development (offline guide)', () => {
    expect(() => readConfig({ NODE_ENV: 'development' })).not.toThrow()
  })

  it('fails fast in production when required secrets are missing', () => {
    expect(() => readConfig({ NODE_ENV: 'production' })).toThrow(
      /DATABASE_URL, META_MUSE_API_KEY/
    )
    expect(() =>
      readConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x' })
    ).toThrow(/META_MUSE_API_KEY/)
  })

  it('accepts a complete production configuration', () => {
    const config = readConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@db:5432/app',
      META_MUSE_API_KEY: 'secret',
      BETTER_AUTH_SECRET: 'x'.repeat(32),
    })
    expect(config.production).toBe(true)
    expect(isLiveConfigured(config)).toBe(true)
    expect(config.meta).toBeUndefined()
  })

  it('requires a strong auth secret and paired Meta credentials', () => {
    const base = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@db:5432/app',
      META_MUSE_API_KEY: 'secret',
    }
    expect(() => readConfig({ ...base, BETTER_AUTH_SECRET: 'short' })).toThrow(
      'BETTER_AUTH_SECRET'
    )
    expect(() =>
      readConfig({
        ...base,
        BETTER_AUTH_SECRET: 'x'.repeat(32),
        META_CLIENT_ID: 'app',
      })
    ).toThrow('META_CLIENT_SECRET')
    expect(
      readConfig({
        ...base,
        BETTER_AUTH_SECRET: 'x'.repeat(32),
        META_CLIENT_ID: 'app',
        META_CLIENT_SECRET: 'shh',
      }).meta
    ).toEqual({ clientId: 'app', clientSecret: 'shh' })
  })

  it('warns for each fallback used when values are unset', () => {
    const writes: string[] = []
    const spy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk) => {
        writes.push(String(chunk))
        return true
      })
    try {
      // VITEST is unset here so the config warnings are emitted.
      readConfig({ DATABASE_URL: 'postgres://user:pass@db:5432/app' })
    } finally {
      spy.mockRestore()
    }
    const events = writes
      .map((line) => JSON.parse(line) as { event: string; message: string })
      .filter((entry) => entry.event === 'config_fallback')
    const names = events.map((entry) => entry.message.split(' ')[0])
    expect(names).toContain('META_MUSE_API_KEY')
    expect(names).toContain('PORT')
    // An explicitly set value does not warn.
    expect(names).not.toContain('DATABASE_URL')
  })
})
