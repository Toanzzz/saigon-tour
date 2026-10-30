import type { XRStore } from '@react-three/xr'
import { useEffect, useState } from 'react'
import { supportsImmersiveVR } from './store'

export function XRSessionButton({ store }: { store: XRStore }) {
  const [supported, setSupported] = useState(false)
  const [active, setActive] = useState(Boolean(store.getState().session))
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let mounted = true
    void supportsImmersiveVR().then((value) => {
      if (mounted) setSupported(value)
    })
    const unsubscribe = store.subscribe((state) => {
      if (mounted) setActive(Boolean(state.session))
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [store])
  if (!supported && !active) return null
  async function toggle() {
    if (busy) return
    setBusy(true)
    try {
      if (active) await store.getState().session?.end()
      else await store.enterVR()
    } catch {
      setSupported(false)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      className="xr-session-button"
      aria-label={active ? 'Exit virtual reality' : 'Enter virtual reality'}
      onClick={() => void toggle()}
      disabled={busy}
    >
      {busy ? 'Connecting…' : active ? 'Exit VR' : 'Enter VR'}
    </button>
  )
}
