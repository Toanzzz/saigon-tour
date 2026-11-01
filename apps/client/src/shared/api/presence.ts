import type { Emote, NpcId, PresencePlayer } from '@saigon/shared'
import { m } from '@/shared/i18n'

/** Localized emote label; call at display time. */
export function emoteText(emote: Emote): string {
  const labels: Record<Emote, () => string> = {
    wave: m.emote_wave,
    thanks: m.emote_thanks,
    hello: m.emote_hello,
    'follow-me': m.emote_follow,
  }
  return labels[emote]()
}
export interface Sample {
  at: number
  player: PresencePlayer
}
export interface PresenceEntry {
  samples: Sample[]
}
export const presence = new Map<string, PresenceEntry>()
export const speech = new Map<string, { text: string; until: number }>()
export const npcSpeech = new Map<NpcId, { text: string; until: number }>()

export function recordPlayer(player: PresencePlayer, at = performance.now()) {
  const entry = presence.get(player.id) ?? { samples: [] }
  entry.samples.push({ at, player })
  entry.samples = entry.samples.slice(-12)
  presence.set(player.id, entry)
}
export function recordPlayers(players: PresencePlayer[], selfId: string) {
  const ids = new Set(players.map((player) => player.id))
  for (const id of presence.keys())
    if (id === selfId || !ids.has(id)) presence.delete(id)
  for (const player of players) if (player.id !== selfId) recordPlayer(player)
}
export function interpolate(
  samples: Sample[],
  now: number,
  delay = 150
): PresencePlayer | null {
  if (!samples.length) return null
  const target = now - delay
  const after = samples.findIndex((sample) => sample.at >= target)
  if (after === 0) return samples[0].player
  if (after < 0) return samples[samples.length - 1].player
  const a = samples[after - 1]
  const b = samples[after]
  const t = Math.min(1, Math.max(0, (target - a.at) / (b.at - a.at || 1)))
  const turn = Math.atan2(
    Math.sin(b.player.heading - a.player.heading),
    Math.cos(b.player.heading - a.player.heading)
  )
  return {
    ...b.player,
    position: a.player.position.map(
      (value, index) => value + (b.player.position[index] - value) * t
    ) as PresencePlayer['position'],
    heading: a.player.heading + turn * t,
  }
}
export function nearestPlayers(
  position: [number, number, number],
  limit: number,
  now = performance.now()
) {
  return [...presence.values()]
    .map((entry) => interpolate(entry.samples, now))
    .filter((player): player is PresencePlayer => player !== null)
    .map((player) => ({
      player,
      distance: Math.hypot(
        position[0] - player.position[0],
        position[2] - player.position[2]
      ),
    }))
    .filter((entry) => entry.distance <= 45)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((entry) => entry.player)
}
export function clearPresence() {
  presence.clear()
  speech.clear()
  npcSpeech.clear()
}
