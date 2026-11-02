import { Canvas, useFrame } from '@react-three/fiber'
import { Component, type ReactNode, Suspense, useRef } from 'react'
import type { Group } from 'three'
import { AvatarLights, Model } from '@/shared/world'
import { Icon } from './icons'

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

/** Keeps a missing GLB (or a lost WebGL context) from blanking the host UI. */
class EmblemBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * The 3D gold coin emblem used wherever the currency appears: HUD header,
 * journal, hub wallet/story cards, and the reward popup. A small transparent,
 * self-contained `<Canvas>` sized like an inline glyph. The flat 2D `coin`
 * `Icon` is the SSR/test fallback (no WebGL in jsdom) and the error fallback.
 */
export function CoinEmblem({ size = 40 }: { size?: number }) {
  // The coin renders at `size` but only occupies half that in layout flow, so
  // doubling the visual coin never grows its host chip/row. The overflow is
  // centred with a symmetric negative margin; the 2D fallback keeps the small
  // footprint so SSR/tests are unaffected.
  const footprint = Math.round(size / 2)
  const bleed = -(size - footprint) / 2
  const fallback = <Icon name="coin" size={footprint} />
  // SSR and tests render the flat glyph; the Canvas is client-only.
  if (typeof window === 'undefined') return fallback
  return (
    <span
      className="coin-emblem"
      style={{ width: size, height: size, margin: bleed }}
      aria-hidden="true"
    >
      <EmblemBoundary fallback={fallback}>
        <Canvas
          className="coin-emblem-canvas"
          style={{ position: 'absolute' }}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 2.6], fov: 35 }}
          gl={{ alpha: true }}
        >
          <AvatarLights />
          <Suspense fallback={null}>
            <Spin>
              <Model
                path="collectibles/coin"
                scale={2.4}
                shadow={false}
                classic
              />
            </Spin>
          </Suspense>
        </Canvas>
      </EmblemBoundary>
    </span>
  )
}
