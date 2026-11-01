import { useSelector } from '@tanstack/react-store'
import { type PointerEvent, useRef } from 'react'
import { m } from '@/shared/i18n'
import { clearInput, input } from '@/shared/runtime/input'
import { setTouchKnob, touchView } from '@/shared/state/view'

export function TouchStick() {
  const ref = useRef<HTMLFieldSetElement>(null)
  const pointer = useRef<number | null>(null)
  const knob = useSelector(touchView, (v) => v.knob)
  // Blur/visibility recentering lives in installInput() so it still fires when
  // the stick is unmounted.
  const reset = () => {
    pointer.current = null
    clearInput()
    setTouchKnob(0, 0)
  }
  function move(event: PointerEvent<HTMLFieldSetElement>) {
    if (pointer.current !== event.pointerId || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    let dx = (event.clientX - rect.left - rect.width / 2) / 36
    let dz = (event.clientY - rect.top - rect.height / 2) / 36
    const length = Math.hypot(dx, dz)
    if (length > 1) {
      dx /= length
      dz /= length
    }
    input.x = dx
    input.z = dz
    setTouchKnob(dx * 28, dz * 28)
  }
  return (
    <fieldset
      ref={ref}
      className="touch-stick"
      aria-label={m.touch_joystick()}
      onPointerDown={(event) => {
        pointer.current = event.pointerId
        event.currentTarget.setPointerCapture(event.pointerId)
        move(event)
      }}
      onPointerMove={move}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      <span className="stick-direction north">↑</span>
      <span className="stick-direction south">↓</span>
      <span className="stick-direction west">←</span>
      <span className="stick-direction east">→</span>
      <span
        className="stick-knob"
        style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }}
      />
    </fieldset>
  )
}
