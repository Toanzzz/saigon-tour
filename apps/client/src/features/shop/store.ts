import type { NpcId } from '@saigon/shared'
import { Store } from '@tanstack/store'

export const shopView = new Store<{
  npc: NpcId | null
  failedArt: readonly string[]
}>({ npc: null, failedArt: [] })
export const showShop = (npc: NpcId) =>
  shopView.setState((state) => ({ ...state, npc }))
export const resetShop = () =>
  shopView.setState(() => ({ npc: null, failedArt: [] }))
export const failShopArt = (id: string) =>
  shopView.setState((state) =>
    state.failedArt.includes(id)
      ? state
      : { ...state, failedArt: [...state.failedArt, id] }
  )
