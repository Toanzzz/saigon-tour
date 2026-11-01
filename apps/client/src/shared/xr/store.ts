import { createXRStore, type XRStore } from '@react-three/xr'
import { useSelector } from '@tanstack/react-store'
import { Store } from '@tanstack/store'

function chooseFrameRate(rates: ArrayLike<number>): number | false {
  for (let index = 0; index < rates.length; index += 1) {
    if (rates[index] === 72) return 72
  }
  return false
}

export const xrStore: XRStore = createXRStore({
  offerSession: false,
  enterGrantedSession: false,
  emulate: false,
  foveation: 0.6,
  frameRate: chooseFrameRate,
  frameBufferScaling: 'mid',
  secondaryInputSources: false,
})

export async function supportsImmersiveVR(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.xr) return false
  try {
    return await navigator.xr.isSessionSupported('immersive-vr')
  } catch {
    return false
  }
}

export interface XrState {
  presenting: boolean
  supported: boolean
}

/** React-visible XR facts, fed by `installXr()` from the zustand `xrStore`. */
export const xr = new Store<XrState>({ presenting: false, supported: false })

export function resetXr() {
  xr.setState(() => ({ presenting: false, supported: false }))
}

/** Mirror the zustand session flag into `xr` and resolve VR support once. */
export function installXr() {
  xr.setState((state) => ({
    ...state,
    presenting: Boolean(xrStore.getState().session),
  }))
  const unsubscribe = xrStore.subscribe((state) => {
    const presenting = Boolean(state.session)
    if (presenting !== xr.state.presenting)
      xr.setState((prev) => ({ ...prev, presenting }))
  })
  void supportsImmersiveVR().then((supported) => {
    if (supported !== xr.state.supported)
      xr.setState((prev) => ({ ...prev, supported }))
  })
  return unsubscribe
}

export const isXRPresenting = () => xr.state.presenting

export function useXRPresenting(): boolean {
  return useSelector(xr, (state) => state.presenting)
}
