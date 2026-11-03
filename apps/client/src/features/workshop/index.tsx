import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { useEffect } from 'react'
import { m } from '@/shared/i18n'
import { QuestInspector } from './quest-inspector'
import { initializeWorkshop, workshop, workshopLocale } from './store'
import { WardrobeInspector } from './wardrobe-inspector'
import './style.css'

const previewQueries = new QueryClient({
  defaultOptions: { mutations: { retry: false } },
})

export default function Workshop() {
  const locale = useSelector(workshop, (state) => state.locale)
  const params = new URLSearchParams(location.search)
  const wardrobe = params.has('wardrobeDebug')
  const capture = params.has('capture')
  useEffect(() => {
    initializeWorkshop()
  }, [])
  return (
    <QueryClientProvider client={previewQueries}>
      <main className="workshop" aria-label={m.debug_title()}>
        {!capture && (
          <header>
            <div>
              <h1>{m.debug_title()}</h1>
              <p>{m.debug_isolated()}</p>
            </div>
            <nav aria-label={m.debug_title()}>
              <a href="?questDebug">{m.debug_quests()}</a>
              <a href="?wardrobeDebug">{m.debug_wardrobe()}</a>
              <a href={import.meta.env.BASE_URL}>{m.pause_continue()}</a>
            </nav>
            <select
              aria-label={m.debug_language()}
              value={locale}
              onChange={(event) =>
                workshopLocale(event.target.value as typeof locale)
              }
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
            <button
              type="button"
              className="wardrobe-tab"
              onClick={initializeWorkshop}
            >
              {m.debug_reset()}
            </button>
          </header>
        )}
        {wardrobe ? (
          <WardrobeInspector capture={capture} />
        ) : (
          <QuestInspector />
        )}
      </main>
    </QueryClientProvider>
  )
}
