import {
  type ItemId,
  type LocationId,
  type MarketItemId,
  marketItemName,
  type NpcId,
  npcText,
  placeLabel,
  type UnlockId,
  type UnlockSlot,
  type UnlockTier,
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
    pho: m.item_pho,
    banana: m.item_banana,
    cake: m.item_cake,
    'coffee-beans': m['item_coffee-beans'],
    'sheet-music': m['item_sheet-music'],
    lanterns: m.item_lanterns,
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

/** Localized unlock name keyed by catalog id; call at render time. */
export function unlockLabel(id: UnlockId): string {
  const key = `unlock_${id.replace(/-/g, '_')}` as keyof typeof m
  const entry = m[key] as (() => string) | undefined
  return entry ? entry() : id
}

export function tierLabel(tier: UnlockTier): string {
  const labels: Record<UnlockTier, () => string> = {
    neutral: m.tier_neutral,
    warm: m.tier_warm,
    close: m.tier_close,
  }
  return labels[tier]()
}

export function slotLabel(slot: UnlockSlot): string {
  const labels: Record<UnlockSlot, () => string> = {
    hat: m.slot_hat,
    outfit: m.slot_outfit,
    accessory: m.slot_accessory,
    vehicle: m.slot_vehicle,
    pet: m.slot_pet,
  }
  return labels[slot]()
}
