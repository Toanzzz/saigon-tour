import { NPCS } from '@saigon/shared'
import { Fragment, type SubmitEvent, useEffect, useRef, useState } from 'react'
import { chat, close } from '@/app/actions'
import { m, npcDisplay } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
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
  const [text, setText] = useState('')
  const [showEarlier, setShowEarlier] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const shownNpc = useRef(dialog?.npc)
  const historyLength = dialog?.history.length
  const thinking = dialog?.thinking
  // Reset the collapse when switching to a different NPC, during render.
  if (dialog && shownNpc.current !== dialog.npc) {
    shownNpc.current = dialog.npc
    if (showEarlier) setShowEarlier(false)
  }
  useEffect(() => {
    if ((historyLength || thinking) && historyRef.current)
      historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [historyLength, thinking])
  if (!dialog) return null
  const npc = { ...NPCS[dialog.npc], ...npcDisplay(dialog.npc) }
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim() || dialog?.thinking) return
    const message = text
    setText('')
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
                  onClick={() => setShowEarlier((open) => !open)}
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
        {dialog.thinking && (
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
          onChange={(event) => setText(event.target.value)}
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
