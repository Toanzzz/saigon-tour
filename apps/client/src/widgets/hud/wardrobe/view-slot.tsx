import { useGLTF, useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Component, type ReactNode, Suspense } from 'react'
import { m } from '@/shared/i18n'
import { modelUrl } from '@/shared/world/assets'

class SlotBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <div className="wardrobe-preview-error" role="alert">
          <p>{m.preview_failed()}</p>
          <button
            type="button"
            onClick={() => {
              this.props.onRetry()
              this.setState((state) => ({
                failed: false,
                attempt: state.attempt + 1,
              }))
            }}
          >
            {m.app_try_again()}
          </button>
        </div>
      )
    return (
      <div key={this.state.attempt} className="wardrobe-live-canvas">
        {this.props.children}
      </div>
    )
  }
}

/** One live fitting canvas; catalog cards use baked thumbnails. */
function PreviewLoading() {
  const { active } = useProgress()
  return active ? (
    <span className="wardrobe-preview-loading" role="status">
      {m.app_loading()}
    </span>
  ) : null
}

export function ViewSlot({
  className,
  children,
  modelPaths = [],
}: {
  className?: string
  children: ReactNode
  modelPaths?: string[]
}) {
  return (
    <div className={className}>
      <SlotBoundary
        onRetry={() => {
          for (const path of modelPaths) useGLTF.clear(modelUrl(path))
        }}
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.2, 3.4], fov: 35 }}
          gl={{ alpha: true, preserveDrawingBuffer: true }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
        <PreviewLoading />
      </SlotBoundary>
    </div>
  )
}
