import { describe, expect, it } from 'vitest'
import { readConfig } from '@/shared/config'

describe('director news url default', () => {
  const env = { VITEST: '1' } as NodeJS.ProcessEnv
  it('defaults to the VnExpress feed in code with no env', () => {
    expect(readConfig(env).directorNewsUrl).toBe(
      'https://vnexpress.net/rss/thoi-su.rss'
    )
  })
  it('honors an explicit override', () => {
    expect(
      readConfig({ ...env, DIRECTOR_NEWS_URL: 'https://x.example/f.rss' })
        .directorNewsUrl
    ).toBe('https://x.example/f.rss')
  })
  it('disables news when set to an empty value', () => {
    expect(
      readConfig({ ...env, DIRECTOR_NEWS_URL: '' }).directorNewsUrl
    ).toBeUndefined()
  })
})
