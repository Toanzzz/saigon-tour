import type { NpcId } from '@saigon/shared'
import { Store } from '@tanstack/store'

export const shopView = new Store<{ npc: NpcId | null }>({ npc: null })
export const showShop = (npc: NpcId) => shopView.setState(() => ({ npc }))
export const resetShop = () => shopView.setState(() => ({ npc: null }))
