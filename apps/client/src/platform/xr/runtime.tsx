import { useXR, XR, XROrigin, type XRStore } from '@react-three/xr'
import { type ReactNode, useRef } from 'react'
import type { Group } from 'three'
import { XRInput } from './input'

export function XRRuntime({
  store,
  children,
  hud,
}: {
  store: XRStore
  children?: ReactNode
  hud?: ReactNode
}) {
  const originRef = useRef<Group>(null)
  return (
    <XR store={store}>
      <XROrigin ref={originRef}>
        <XRInput originRef={originRef} />
        <XRHud content={hud} />
      </XROrigin>
      {children}
    </XR>
  )
}

function XRHud({ content }: { content?: ReactNode }) {
  const session = useXR((state) => state.session)
  return session ? content : null
}
