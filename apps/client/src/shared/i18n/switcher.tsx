import type { Locale } from '@saigon/shared'
import { changeLocale, useLocale } from './locale'

/** Endonyms, so each option reads the same in either language. */
const LANGUAGES: { id: Locale; short: string; name: string }[] = [
  { id: 'en', short: 'EN', name: 'English' },
  { id: 'vi', short: 'VI', name: 'Tiếng Việt' },
]

export function LanguageToggle() {
  const current = useLocale()
  return (
    <fieldset className="language-toggle">
      <legend className="sr-only">Language / Ngôn ngữ</legend>
      {LANGUAGES.map((language) => (
        <button
          type="button"
          key={language.id}
          lang={language.id}
          aria-label={language.name}
          aria-pressed={current === language.id}
          onClick={() => changeLocale(language.id)}
        >
          {language.short}
        </button>
      ))}
    </fieldset>
  )
}

export function LanguageSelect() {
  const current = useLocale()
  return (
    <div className="settings-row language-row">
      <label htmlFor="game-language">Language / Ngôn ngữ</label>
      <select
        id="game-language"
        value={current}
        onChange={(event) => changeLocale(event.target.value as Locale)}
      >
        {LANGUAGES.map((language) => (
          <option key={language.id} value={language.id} lang={language.id}>
            {language.name}
          </option>
        ))}
      </select>
    </div>
  )
}
