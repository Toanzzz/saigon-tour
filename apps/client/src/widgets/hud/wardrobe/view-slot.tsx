import { View } from '@react-three/drei'
import {
  Component,
  type ReactNode,
  type RefObject,
  Suspense,
  useRef,
} from 'react'

/** Keeps one missing GLB from blanking the whole panel. */
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
 * A DOM box tracked by a shared `<Canvas>` through drei `<View>`. The 3D
 * children render into the box's screen rectangle. Each slot owns its own
 * Suspense and error boundary.
 */
export function ViewSlot({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const track = useRef<HTMLDivElement>(null)
  return (
    <div ref={track} className={className}>
      <SlotBoundary>
        <View track={track as RefObject<HTMLElement>}>
          <Suspense fallback={null}>{children}</Suspense>
        </View>
      </SlotBoundary>
    </div>
  )
}
