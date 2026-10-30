import { useProgress } from '@react-three/drei'
import { QueryClientProvider } from '@tanstack/react-query'
import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { installInput } from './core/input'
import { queryClient } from './net/agent'
import { Scene } from './scene'
import { GameUI } from './ui'
import './ui/styles.css'

function Loading() {
  const { active, progress } = useProgress()
  return active ? (
    <div className="loading-badge" role="status">
      Preparing your neighborhood <span>{Math.round(progress)}%</span>
    </div>
  ) : null
}
function App() {
  useEffect(installInput, [])
  return (
    <QueryClientProvider client={queryClient}>
      <main aria-label="Sài Gòn exploration game">
        <div className="game-canvas">
          <Scene />
        </div>
        <GameUI />
        <Loading />
      </main>
    </QueryClientProvider>
  )
}
class GameBoundary extends Component<
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
        <h1>The neighborhood couldn’t load</h1>
        <p>
          Check your connection and enable WebGL in your browser, then try
          again.
        </p>
        <button type="button" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
const root = document.getElementById('root')
if (root)
  createRoot(root).render(
    <GameBoundary>
      <App />
    </GameBoundary>
  )
