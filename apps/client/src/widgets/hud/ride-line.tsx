import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef } from 'react'
import { gossipLines } from '@/features/transport/gossip'
import { city } from '@/shared/api/city'
import { game, notify, trackedQuest } from '@/shared/state/game'
import { clock } from '@/shared/state/ui'
import { isXRPresenting } from '@/shared/xr/store'

/** Progress bands the cyclo advances its gossip at. */
const BANDS = [0.2, 0.5, 0.8] as const

/** The gossip index for the current ride progress. */
function lineIndex(progress: number, count: number): number {
  if (count <= 1) return 0
  let index = 0
  for (let i = 0; i < BANDS.length; i++) if (progress >= BANDS[i]) index = i
  return Math.min(index, count - 1)
}

/**
 * One driver subtitle while a ride is active. The cyclo talks at three progress
 * bands; every other mode shows a single line. In XR the line arrives as a
 * toast instead of an overlay.
 */
export function RideLine() {
  const ride = useSelector(game, (s) => s.ride)
  const event = useSelector(city, (s) => s.events[0] ?? null)
  const now = useSelector(clock, (s) => s.now)
  const lastSpoken = useRef<string | null>(null)
  const lastRide = useRef<string | null>(null)

  const lines = ride
    ? gossipLines({
        mode: ride.mode,
        destination: ride.to,
        event,
        quest: trackedQuest(game.state),
        now,
      })
    : []
  const index = ride ? lineIndex(ride.progress, lines.length) : 0
  const line = lines[index] ?? null

  // Reset when a new ride begins so the opener always speaks first.
  const rideKey = ride ? `${ride.from}-${ride.to}-${ride.mode}` : null
  if (rideKey !== lastRide.current) {
    lastRide.current = rideKey
    lastSpoken.current = null
  }

  useEffect(() => {
    if (!line || line === lastSpoken.current) return
    lastSpoken.current = line
    if (isXRPresenting()) notify(line)
  }, [line])

  if (!ride || !line || isXRPresenting()) return null
  return <span className="ride-line">{line}</span>
}
