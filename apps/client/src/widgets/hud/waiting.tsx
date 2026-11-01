import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { net } from '@/shared/api/status'
import { m } from '@/shared/i18n'

/** Minutes under an hour, otherwise `h min`, from a live millisecond total. */
function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours
    ? m.waiting_hours({ hours, minutes })
    : m.waiting_minutes({ minutes })
}

/**
 * Global notice shown while the one world room is full. Solo play continues;
 * the socket layer rejoins automatically once a spot opens.
 */
export function WaitingNotice() {
  const waiting = useSelector(net, (value) => value.waiting)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [waiting])
  if (!waiting) return null
  const elapsed = waiting.longest
    ? waiting.longest.stayedMs + (now - waiting.receivedAt)
    : 0
  return (
    <div className="waiting-notice" role="status">
      <strong>{m.waiting_title()}</strong>
      <p>{m.waiting_notice({ capacity: waiting.capacity })}</p>
      {waiting.longest && (
        <p className="waiting-longest">
          {m.waiting_longest({
            name: waiting.longest.name,
            duration: formatDuration(elapsed),
          })}
        </p>
      )}
    </div>
  )
}
