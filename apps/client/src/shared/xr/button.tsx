import type { XRStore } from '@react-three/xr'
import { useMutation } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { shallow } from '@tanstack/store'
import { m } from '@/shared/i18n'
import { xr } from './store'

export function XRSessionButton({ store }: { store: XRStore }) {
  const { supported, active } = useSelector(
    xr,
    (state) => ({ supported: state.supported, active: state.presenting }),
    { compare: shallow }
  )
  const toggle = useMutation({
    mutationFn: async () => {
      if (active) await store.getState().session?.end()
      else await store.enterVR()
    },
    onError: () => {
      // enterVR can reject when the headset refuses; hide the control.
      xr.setState((state) => ({ ...state, supported: false }))
    },
  })
  if (!supported && !active) return null
  return (
    <button
      type="button"
      className="xr-session-button"
      aria-label={active ? m.xr_exit_label() : m.xr_enter_label()}
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
    >
      {toggle.isPending
        ? m.xr_connecting()
        : active
          ? m.xr_exit()
          : m.xr_enter()}
    </button>
  )
}
