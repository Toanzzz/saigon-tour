import { useSelector } from '@tanstack/react-store'
import { useLayoutEffect } from 'react'
import { m } from '@/shared/i18n'
import { loadingPanels, setLoadingPanel } from './loading-state'
import './loading-panel.css'

/** The canvas fallback signals suspension; the DOM owns the overlay. */
export function LoadingSignal({ scope }: { scope: string }) {
  useLayoutEffect(() => {
    setLoadingPanel(scope, true)
    return () => setLoadingPanel(scope, false)
  }, [scope])
  return null
}

export function SuspensePanel({
  scope,
  preview = false,
}: {
  scope: string
  preview?: boolean
}) {
  const pending = useSelector(loadingPanels, (state) => state.has(scope))
  return pending ? <LoadingPanel preview={preview} /> : null
}

export function LoadingPanel({ preview = false }: { preview?: boolean }) {
  return (
    <div className="loading-panel" role="status" aria-live="polite">
      <div className="loading-panel-card">
        <span className="loading-panel-lantern" aria-hidden="true">
          <span />
        </span>
        <strong>{preview ? m.wardrobe_loading() : m.app_loading()}</strong>
        <span className="loading-panel-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  )
}
