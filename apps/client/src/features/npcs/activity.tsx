import { type NpcId, npcActivity } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useMemo } from 'react'
import { city } from '@/shared/api/city'
import { clock, startClock, stopClock } from '@/shared/state/ui'

export const npcBehaviors = new Map<
  NpcId,
  { activityId: string; animation: string; moving: boolean; paused: boolean }
>()

export function useNpcActivity(id: NpcId) {
  const assignment = useSelector(city, (snapshot) => snapshot.npcActivities[id])
  const expired = useSelector(clock, ({ now }) =>
    assignment ? now >= assignment.endsAt : false
  )
  useEffect(() => {
    if (!assignment) return
    startClock()
    return stopClock
  }, [assignment])
  return useMemo(() => {
    void assignment
    void expired
    return npcActivity(id, city.state)
  }, [id, assignment, expired])
}
