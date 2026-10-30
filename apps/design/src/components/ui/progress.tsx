import { cn } from '../../lib/utils'

export function Progress({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <div className={cn('progress-track', className)}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}
