import { Canvas } from '@react-three/fiber'
import { Component, type ReactNode, Suspense } from 'react'

/** Keeps one missing GLB (or a lost WebGL context) from blanking the panel. */
class SlotBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * A self-contained 3D preview box. Each slot owns its own `<Canvas>` with an
 * explicit camera, matching the reliable per-element approach used by the coin
 * emblem. (The earlier shared-Canvas drei `<View>` pattern rendered nothing in
 * the wardrobe.) The camera frames content centred on the origin.
 */
export function ViewSlot({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <SlotBoundary>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.2, 3.4], fov: 35 }}
          gl={{ alpha: true }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      </SlotBoundary>
    </div>
  )
}
