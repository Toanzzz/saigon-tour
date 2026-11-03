import type { NeighborId } from '@saigon/shared'
import { NPCS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import type { SubmitEvent } from 'react'
import { chat, close } from '@/app/actions'
import { MicButton } from '@/features/voice'
import { city } from '@/shared/api/city'
import { m, npcDisplay } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
import { chatDraft, setChatText } from '@/shared/state/ui'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'
import { placeName } from '@/shared/world/places'
import { AffinityAvatar } from './affinity-avatar'
import { AvatarRenderer } from './avatar-render'
import { NpcErrands } from './errands'
import { Transcript } from './transcript'

export function Conversation({ state }: { state: GameState }) {
  const dialog = state.dialogue
  const text = useSelector(chatDraft, (draft) => draft.text)
  const placement = useSelector(city, (state) =>
    dialog
      ? state.npcPlacements[dialog.npc as NeighborId]?.locationId
      : undefined
  )
  if (!dialog) return null
  const npc = { ...NPCS[dialog.npc], ...npcDisplay(dialog.npc) }
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim() || dialog?.thinking) return
    const message = text
    setChatText('')
    await chat(message)
  }
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
      <form
        className="conversation-input"
        onSubmit={(event) => {
          void send(event)
        }}
      >
        <label className="sr-only" htmlFor="npc-message">
          {m.chat_your_message()}
        </label>
        <input
          id="npc-message"
          value={text}
          maxLength={500}
          placeholder={m.chat_placeholder()}
          autoComplete="off"
          onChange={(event) => setChatText(event.target.value)}
          disabled={dialog.thinking}
        />
        <MicButton thinking={dialog.thinking} onTranscript={chat} />
        <button
          type="submit"
          className="icon-button"
          aria-label={m.chat_send()}
          disabled={dialog.thinking || !text.trim()}
        >
          <Icon name="arrow" />
        </button>
      </form>
      <AvatarRenderer />
    </Dialog>
  )
}
