import type { NeighborId } from '@saigon/shared'
import { NPC_SHOPS, NPCS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { chat, close } from '@/app/actions'
import { NpcShop, resetShop, shopView, showShop } from '@/features/shop'
import { VoiceComposer } from '@/features/voice'
import { city } from '@/shared/api/city'
import { m, npcDisplay } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
import { Dialog } from '@/shared/ui/dialog'
import { placeName } from '@/shared/world/places'
import { AffinityAvatar } from './affinity-avatar'
import { AvatarRenderer } from './avatar-render'
import { NpcErrands } from './errands'
import { Transcript } from './transcript'

export function Conversation({ state }: { state: GameState }) {
  const dialog = state.dialogue
  const placement = useSelector(city, (state) =>
    dialog
      ? state.npcPlacements[dialog.npc as NeighborId]?.locationId
      : undefined
  )
  const sale = useSelector(city, (value) => value.rareOffer)
  const shopNpc = useSelector(shopView, (value) => value.npc)
  if (!dialog) return null
  const shopping = shopNpc === dialog.npc
  const hasShop =
    NPC_SHOPS[dialog.npc].length > 0 || sale?.npcId === dialog.npc || shopping
  const npc = { ...NPCS[dialog.npc], ...npcDisplay(dialog.npc) }
  return (
    <Dialog
      title={npc.name}
      eyebrow={`${npc.role} · ${placeName(placement ?? npc.location)}`}
      onClose={close}
      className="conversation"
    >
      <AffinityAvatar npcId={dialog.npc} friendship={state.friendship} />
      {hasShop && (
        <div className="conversation-shop-tabs">
          <button type="button" aria-pressed={!shopping} onClick={resetShop}>
            {m.shop_talk()}
          </button>
          <button
            type="button"
            aria-pressed={shopping}
            onClick={() => showShop(dialog.npc)}
          >
            {m.shop_title()}
          </button>
        </div>
      )}
      {shopping ? (
        <NpcShop npc={dialog.npc} state={state} />
      ) : (
        <>
          {!dialog.thinking && <NpcErrands state={state} npc={dialog.npc} />}
          <Transcript dialog={dialog} />
          <VoiceComposer thinking={dialog.thinking} onSend={chat} />
          <AvatarRenderer />
        </>
      )}
    </Dialog>
  )
}
