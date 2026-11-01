import { useProgress } from '@react-three/drei'
import { QueryClientProvider } from '@tanstack/react-query'
import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react'
import { queryClient } from '@/shared/api/agent'
import { initializeSession } from '@/shared/api/session'
import { installRealtime } from '@/shared/api/socket'
import { installAudioSync } from '@/shared/audio'
import { m, useLocale } from '@/shared/i18n'
import { installInput } from '@/shared/runtime/input'
import { installXr } from '@/shared/xr'
import { GameUI } from './game-ui'
import { Scene } from './scene'
import { installTestHooks } from './test-hooks'

function Loading() {
  const { active, progress } = useProgress()
  return active ? (
    <div className="loading-badge" role="status">
      {m.app_loading()} <span>{Math.round(progress)}%</span>
    </div>
  ) : null
}

export function App() {
  // Remount only the DOM layer on language change; the scene keeps running.
  const locale = useLocale()
  useEffect(() => {
    void initializeSession()
    installTestHooks()
    const stopInput = installInput()
    const stopRealtime = installRealtime()
    const stopXr = installXr()
    const stopAudioSync = installAudioSync()
    return () => {
      stopInput()
      stopRealtime()
      stopXr()
      stopAudioSync()
    }
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <main aria-label={m.app_label()}>
        <div className="game-canvas">
          <Scene />
        </div>
        <GameUI key={locale} />
        <Loading />
      </main>
    </QueryClientProvider>
  )
}

export class GameBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    return this.state.error ? (
      <div className="fatal-error">
        <h1>{m.app_fatal_title()}</h1>
        <p>{m.app_fatal_body()}</p>
        <button type="button" onClick={() => location.reload()}>
          {m.app_try_again()}
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
