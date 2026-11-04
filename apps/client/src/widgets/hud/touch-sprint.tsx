import { useSelector } from '@tanstack/react-store'
import { stamina } from '@/features/stamina'
import { m } from '@/shared/i18n'
import { input } from '@/shared/runtime/input'

export function TouchSprint() {
  const exhausted = useSelector(stamina, (state) => state.exhausted)
  const release = () => {
    input.sprint = false
  }
  return (
    <button
      type="button"
      className={`touch-sprint${exhausted ? ' is-exhausted' : ''}`}
      aria-label={m.stamina_sprint()}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        input.sprint = true
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onBlur={release}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M15 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 9l5-3 3 5 5 1M12 7l-3 7 5 3-1 5M9 14l-3 7H2" />
      </svg>
      <span>{m.pause_key_faster()}</span>
    </button>
  )
}
