import type { NeighborId } from '@saigon/shared'
import { NPCS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { chat, close } from '@/app/actions'
import { VoiceComposer } from '@/features/voice'
import { city } from '@/shared/api/city'
import { npcDisplay } from '@/shared/i18n'
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
  if (!dialog) return null
  const npc = { ...NPCS[dialog.npc], ...npcDisplay(dialog.npc) }
  return (
    <Dialog
      title={npc.name}
      eyebrow={`${npc.role} · ${placeName(placement ?? npc.location)}`}
      onClose={close}
      className="conversation"
    >
      <AffinityAvatar npcId={dialog.npc} friendship={state.friendship} />
      {!dialog.thinking && <NpcErrands state={state} npc={dialog.npc} />}
      <Transcript dialog={dialog} />
      <VoiceComposer thinking={dialog.thinking} onSend={chat} />
      <AvatarRenderer />
    </Dialog>
  )
}
