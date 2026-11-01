import { type Locale, LocaleSchema } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { Store } from '@tanstack/store'
import { m } from '@/paraglide/messages'
import {
  defineCustomClientStrategy,
  getLocale,
  setLocale,
} from '@/paraglide/runtime'
import { queryCacheRestored, queryClient } from '@/shared/api/query'

export type { Locale }
export const SETTINGS_KEY = ['settings'] as const
let choosing = false

/** Saved language lives in the persisted query cache, so "Clear saved data" resets it. */
defineCustomClientStrategy('custom-saved', {
  getLocale: () => {
    const saved = queryClient.getQueryData<{ locale?: unknown }>(SETTINGS_KEY)
    const parsed = LocaleSchema.safeParse(saved?.locale)
    return parsed.success ? parsed.data : undefined
  },
  // Paraglide also calls this on first resolve; only an explicit choice is saved,
  // otherwise the browser language would stick and block cache restore.
  setLocale: (locale) => {
    if (choosing) queryClient.setQueryData(SETTINGS_KEY, { locale })
  },
})

export const locale = new Store<Locale>(getLocale())

function applyDocument(next: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = next
  document.title = m.app_title()
}

/** Switch language live, saving the choice. */
export function changeLocale(next: Locale) {
  choosing = true
  try {
    void setLocale(next, { reload: false })
  } finally {
    choosing = false
  }
  locale.setState(() => next)
  applyDocument(next)
}

/** The saved choice only exists once the persisted cache is restored. */
export const localeReady = queryCacheRestored.then(() => {
  const current = getLocale()
  locale.setState(() => current)
  applyDocument(current)
})

export function useLocale() {
  return useSelector(locale, (value) => value)
}
