import { useProgress } from '@react-three/drei'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  Component,
  type ErrorInfo,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
} from 'react'
import { MapInspector, mapInspectorEnabled } from '@/features/map-inspector'
import { queryClient } from '@/shared/api/agent'
import { initializeSession } from '@/shared/api/session'
import { installRealtime } from '@/shared/api/socket'
import { installAudioSync } from '@/shared/audio'
import { m, useLocale } from '@/shared/i18n'
import { installInput } from '@/shared/runtime/input'
import { installRiddles } from '@/shared/state/riddles'
import { installTwists } from '@/shared/state/twists'
import { installUiResets, installWaitingClock } from '@/shared/state/ui-resets'
import { installXr } from '@/shared/xr'
import { GameUI } from './game-ui'
import { Scene } from './scene'
import { installTestHooks } from './test-hooks'

const Workshop = import.meta.env.DEV
  ? lazy(() => import('@/features/workshop'))
  : null

function Loading() {
  const { active, progress } = useProgress()
  return active ? (
    <div className="loading-badge" role="status">
      {m.app_loading()} <span>{Math.round(progress)}%</span>
    </div>
  ) : null
}

export function App() {
  const params = new URLSearchParams(location.search)
  if (Workshop && (params.has('questDebug') || params.has('wardrobeDebug')))
    return (
      <Suspense fallback={<Loading />}>
        <Workshop />
      </Suspense>
    )
  return mapInspectorEnabled() ? <MapInspector /> : <GameApp />
}

function GameApp() {
  // Remount only the DOM layer on language change; the scene keeps running.
  const locale = useLocale()
  useEffect(() => {
    void initializeSession()
    installTestHooks()
    const stopInput = installInput()
    const stopRealtime = installRealtime()
    const stopXr = installXr()
    const stopAudioSync = installAudioSync()
    const stopUiResets = installUiResets()
    const stopWaitingClock = installWaitingClock()
    const stopTwists = installTwists()
    const stopRiddles = installRiddles()
    return () => {
      stopInput()
      stopRealtime()
      stopXr()
      stopAudioSync()
      stopUiResets()
      stopWaitingClock()
      stopTwists()
      stopRiddles()
    }
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <main aria-label={m.app_label()}>
        <div className="game-canvas">
          <Scene />
        </div>
        <GameUI key={locale} />
        {import.meta.env.DEV && (
          <nav className="dev-workshop-links" aria-label={m.debug_title()}>
            <a href="?questDebug">{m.debug_quests()}</a>
            <a href="?wardrobeDebug">{m.debug_wardrobe()}</a>
          </nav>
        )}
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
