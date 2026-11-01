import {
  type ItemId,
  type LocationId,
  type MarketItemId,
  marketItemName,
  type NpcId,
  npcText,
  placeLabel,
} from '@saigon/shared'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'

/** Localized carried-item name; call at render time. */
export function itemLabel(itemId: ItemId): string {
  const labels: Record<ItemId, () => string> = {
    herbs: m.item_herbs,
    postcard: m.item_postcard,
    photo: m.item_photo,
    noodles: m.item_noodles,
    broth: m.item_broth,
    baguette: m.item_baguette,
    coffee: m.item_coffee,
    banana: m.item_banana,
  }
  return labels[itemId]()
}

export const npcDisplay = (npcId: NpcId) => npcText(npcId, getLocale())
export const npcLabel = (npcId: NpcId) => npcDisplay(npcId).name
export const marketItemLabel = (itemId: MarketItemId) =>
  marketItemName(itemId, getLocale())
export const placeSign = (locationId: LocationId) =>
  placeLabel(locationId, getLocale()).toLocaleUpperCase(getLocale())

export function formatNumber(value: number) {
  return new Intl.NumberFormat(getLocale()).format(value)
}

/** Server socket error codes; anything unknown gets a generic line. */
export function errorMessage(code: string): string {
  const messages: Record<string, () => string> = {
    already_in_party: m.err_already_in_party,
    cannot_invite_self: m.err_cannot_invite_self,
    different_room: m.err_different_room,
    invite_expired: m.err_invite_expired,
    invite_not_found: m.err_invite_expired,
    party_changed: m.err_party_changed,
    party_full: m.err_party_full,
    party_unavailable: m.err_service_unavailable,
    player_not_connected: m.err_player_not_connected,
    player_not_in_room: m.err_player_not_connected,
    service_unavailable: m.err_service_unavailable,
    too_far: m.err_too_far,
  }
  return (Object.hasOwn(messages, code) ? messages[code] : m.err_generic)()
}
