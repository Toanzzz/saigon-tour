import { Canvas, useFrame } from '@react-three/fiber'
import { Component, type ReactNode, Suspense, useRef } from 'react'
import type { Group } from 'three'
import { AvatarLights, Model } from '@/shared/world'

/** Slow spin about the emblem axis (model up after export_yup). */
function Spin({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null)
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += 0.9 * delta
  })
  // Tilt the upright disc toward the camera so an emblem face stays visible.
  return (
    <group rotation={[0.4, 0, 0]}>
      <group ref={group}>{children}</group>
    </group>
  )
}

/** Keeps a missing GLB from blanking the reward popup. */
class StageBoundary extends Component<
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
 * Client-only spinning 3D coin for the reward popup. A small transparent,
 * modal-only `<Canvas>` (not an always-on HUD canvas); the 2D `Icon` stays as
 * the SSR/test fallback in `reward.tsx`.
 */
export function CoinStage() {
  return (
    <div className="reward-coin-stage">
      <StageBoundary>
        <Canvas
          className="reward-coin-canvas"
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 2.6], fov: 35 }}
          gl={{ alpha: true }}
          frameloop="always"
        >
          <AvatarLights />
          <Suspense fallback={null}>
            <Spin>
              <Model path="collectibles/coin" scale={2.4} shadow={false} />
            </Spin>
          </Suspense>
        </Canvas>
      </StageBoundary>
    </div>
  )
}
