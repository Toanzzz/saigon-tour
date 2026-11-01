import type { NpcId, PresencePlayer, TimeOfDay } from '@saigon/shared'
import type { Room } from './rooms'

/** Close codes the client distinguishes (4000–4999 are application codes). */
export const CLOSE = {
  replaced: 4002,
  reset: 4003,
  violation: 4008,
} as const
export const ROOM_CAPACITY = 20

export const RETAIN_MS = 60_000
export const STREETS = [
  'Nguyễn Huệ',
  'Lê Lợi',
  'Đồng Khởi',
  'Hàm Nghi',
  'Pasteur',
]
export function timeBucket(now: number): TimeOfDay {
  const hour = (new Date(now).getUTCHours() + 7) % 24
  return hour < 6
    ? 'night'
    : hour < 12
      ? 'morning'
      : hour < 18
        ? 'afternoon'
        : 'evening'
}
export function nearNpc(player: PresencePlayer, npcId: NpcId, room: Room) {
  const position = room.city.position(npcId)
  return (
    !player.ride &&
    Math.hypot(
      player.position[0] - position[0],
      player.position[2] - position[2]
    ) <= 10
  )
}
