import { NPCS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { Fragment, type SubmitEvent, useEffect, useRef } from 'react'
import { chat, close } from '@/app/actions'
import { m, npcDisplay } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
import {
  chatDraft,
  setChatText,
  toggleChatShowEarlier,
} from '@/shared/state/ui'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'
import { placeName } from '@/shared/world/places'
import { AffinityAvatar } from './affinity-avatar'
import { AvatarRenderer } from './avatar-render'
import { NpcErrands } from './errands'
import { NpcAvatar } from './npc-avatar'

const messageKeys = new WeakMap<object, string>()
let nextMessageKey = 0
function messageKey(message: object) {
  let key = messageKeys.get(message)
  if (!key) {
    key = `message-${nextMessageKey++}`
    messageKeys.set(message, key)
  }
  return key
}

export function Conversation({ state }: { state: GameState }) {
  const dialog = state.dialogue
  // Composer text and earlier-history toggle live in the chatDraft store; the
  // NPC-switch reset is handled centrally in installUiResets (ui-resets.ts).
  const text = useSelector(chatDraft, (draft) => draft.text)
  const showEarlier = useSelector(chatDraft, (draft) => draft.showEarlier)
  const historyRef = useRef<HTMLDivElement>(null)
  const historyLength = dialog?.history.length
  const thinking = dialog?.thinking
  const streamingText = dialog?.streamingText
  useEffect(() => {
    if ((historyLength || thinking || streamingText) && historyRef.current)
      historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [historyLength, thinking, streamingText])
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
      eyebrow={`${npc.role} · ${placeName(npc.location)}`}
      onClose={close}
      className="conversation"
    >
      <AffinityAvatar npcId={dialog.npc} friendship={state.friendship} />
      {!dialog.thinking && <NpcErrands state={state} npc={dialog.npc} />}
      <div
        className="conversation-history"
        ref={historyRef}
        role="log"
        aria-label={m.chat_log()}
        aria-live="polite"
      >
        {(() => {
          const earlierCount = Math.min(
            dialog.earlierCount ?? 0,
            dialog.history.length
          )
          const row = (line: {
            role: 'user' | 'assistant'
            content: string
          }) => (
            <Fragment key={messageKey(line)}>
              {line.role === 'assistant' ? (
                <div className="speech-row">
                  <NpcAvatar id={dialog.npc} size="sm" />
                  <p className="speech assistant">{line.content}</p>
                </div>
              ) : (
                <p className="speech user">
                  <span className="speaker">{m.map_you()}</span>
                  {line.content}
                </p>
              )}
            </Fragment>
          )
          return (
            <>
              {earlierCount > 0 && (
                <button
                  type="button"
                  className="history-toggle"
                  aria-expanded={showEarlier}
                  onClick={toggleChatShowEarlier}
                >
                  {showEarlier
                    ? m.history_hide_earlier()
                    : m.history_show_earlier({ count: earlierCount })}
                </button>
              )}
              {showEarlier &&
                dialog.history.slice(0, earlierCount).map((line) => row(line))}
              {dialog.history.slice(earlierCount).map((line) => row(line))}
            </>
          )
        })()}
        {dialog.thinking && dialog.streamingText && (
          <div className="speech-row">
            <NpcAvatar id={dialog.npc} size="sm" />
            <p className="speech assistant">{dialog.streamingText}</p>
          </div>
        )}
        {dialog.thinking && !dialog.streamingText && (
          <p className="thinking" role="status">
            <span />
            {m.chat_thinking({ name: npc.name })}
          </p>
        )}
      </div>
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
