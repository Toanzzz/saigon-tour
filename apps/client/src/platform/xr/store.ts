import { createXRStore, type XRStore } from '@react-three/xr'

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
