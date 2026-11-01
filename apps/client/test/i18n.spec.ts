import { InteractRequestSchema, LocaleSchema } from '@saigon/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { m } from '@/paraglide/messages'
import {
  extractLocaleFromNavigator,
  getLocale,
  locales,
} from '@/paraglide/runtime'
import { queryClient } from '@/shared/api/query'
import { changeLocale, locale, SETTINGS_KEY } from '@/shared/i18n'
import en from '../messages/en.json'
import viMessages from '../messages/vi.json'

afterEach(() => {
  vi.unstubAllGlobals()
  changeLocale('en')
})

describe('i18n', () => {
  it('runs tests in English', () => {
    expect(getLocale()).toBe('en')
    expect(m.app_title()).toBe('Saigon, a little journey')
  })

  it('shares one locale list with the contracts', () => {
    expect([...locales]).toEqual(LocaleSchema.options)
  })

  it('keeps both catalogs on the same keys', () => {
    expect(Object.keys(viMessages).sort()).toEqual(Object.keys(en).sort())
  })

  it('sends the language with NPC requests, defaulting to English', () => {
    const base = {
      message: 'Xin chào',
      worldContext: { playerLocation: 'market', timeOfDay: 'afternoon' },
    }
    expect(InteractRequestSchema.parse(base).locale).toBe('en')
    expect(InteractRequestSchema.parse({ ...base, locale: 'vi' }).locale).toBe(
      'vi'
    )
    expect(
      InteractRequestSchema.safeParse({ ...base, locale: 'fr' }).success
    ).toBe(false)
  })

  it('maps a Vietnamese browser to vi', () => {
    vi.stubGlobal('navigator', { languages: ['vi-VN', 'en-US'] })
    expect(extractLocaleFromNavigator()).toBe('vi')
    vi.stubGlobal('navigator', { languages: ['fr-FR'] })
    expect(extractLocaleFromNavigator()).toBeUndefined()
  })

  it('never lets persisted queries expire before they are saved', () => {
    for (const key of ['session', 'settings'])
      expect(queryClient.getQueryDefaults([key]).gcTime).toBe(
        Number.POSITIVE_INFINITY
      )
  })

  it('saves an explicit choice in the query cache', () => {
    changeLocale('vi')
    expect(getLocale()).toBe('vi')
    expect(locale.state).toBe('vi')
    expect(queryClient.getQueryData(SETTINGS_KEY)).toEqual({ locale: 'vi' })
    expect(m.app_title()).toBe('Sài Gòn, một chuyến đi nhỏ')
  })

  it('keeps the saved choice past the default gc window', async () => {
    vi.useFakeTimers()
    changeLocale('vi')
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    expect(queryClient.getQueryData(SETTINGS_KEY)).toEqual({ locale: 'vi' })
    vi.useRealTimers()
  })
})
