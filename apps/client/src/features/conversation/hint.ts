import {
  type CityEvent,
  type CitySnapshot,
  friendlinessOf,
  hostingEvent,
  type NeighborId,
  NPC_ACTIVITIES,
  NPCS,
  npcActivity,
} from '@saigon/shared'
import { getLocale, m, npcLabel } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
import { canAskMilestone, dialogueQuests } from '@/shared/state/quests'

function eventLabel(kind: CityEvent['kind']): string {
  switch (kind) {
    case 'festival':
      return m.chat_hint_event_festival()
    case 'market-rush':
      return m.chat_hint_event_market_rush()
    case 'rain':
      return m.chat_hint_event_rain()
    case 'street-music':
      return m.chat_hint_event_street_music()
    case 'lost-item':
      return m.chat_hint_event_lost_item()
  }
}

export function conversationHint(
  state: GameState,
  city: CitySnapshot,
  now = Date.now()
): string | null {
  const dialog = state.dialogue
  if (!dialog) return null
  const { npc } = dialog
  const earlierCount = Math.min(dialog.earlierCount ?? 0, dialog.history.length)
  if (dialog.history.slice(earlierCount).some((line) => line.role === 'user'))
    return null
  const { fromNpc, forNpc, canHelp } = dialogueQuests(state, npc)
  if (fromNpc.length || forNpc.length || canAskMilestone(state, npc))
    return null

  const name = npcLabel(npc)
  const level = friendlinessOf(state.friendship, npc)
  if (level <= -3) return m.chat_hint_cold({ name })
  if (level < 0) return m.chat_hint_wary({ name })
  if (canHelp) {
    const activeCity = {
      ...city,
      events: city.events.filter(
        (event) => event.startedAt <= now && event.endsAt > now
      ),
    }
    const hosting = hostingEvent(activeCity, npc)
    if (hosting)
      return m.chat_hint_hosting({ name, event: eventLabel(hosting.kind) })
    if (NPCS[npc].kind === 'neighbor' && city.needs[npc as NeighborId])
      return m.chat_hint_need({ name })
  }

  const catalog = NPC_ACTIVITIES[npc]
  const id = dialog.activity?.id
  const activity = id
    ? Object.hasOwn(catalog, id)
      ? catalog[id]
      : catalog.default
    : npcActivity(npc, city, now)
  const hint =
    activity.conversationHints[earlierCount > 0 ? 'returning' : 'first']
  return hint[getLocale()].replaceAll('{name}', name)
}
