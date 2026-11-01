import { NPCS } from '@saigon/shared'
import { type SubmitEvent, useEffect, useRef, useState } from 'react'
import { chat, close } from '@/app/actions'
import type { GameState } from '@/shared/state/game'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'
import { PLACES } from '@/shared/world/places'
import { NpcErrands } from './errands'

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
  const historyRef = useRef<HTMLDivElement>(null)
  const historyLength = dialog?.history.length
  const thinking = dialog?.thinking
  useEffect(() => {
    if ((historyLength || thinking) && historyRef.current)
      historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [historyLength, thinking])
  if (!dialog) return null
  const npc = NPCS[dialog.npc]
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
      eyebrow={`${npc.role} · ${PLACES[npc.location].name}`}
      onClose={close}
      className="conversation"
    >
      <div className={`portrait portrait-${dialog.npc}`} aria-hidden="true">
        <span>{npc.name.split(' ').at(-1)?.slice(0, 1)}</span>
      </div>
      {!dialog.thinking && <NpcErrands state={state} npc={dialog.npc} />}
      <div
        className="conversation-history"
        ref={historyRef}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {dialog.history.map((line) => (
          <p className={`speech ${line.role}`} key={messageKey(line)}>
            {line.role === 'user' && <span className="speaker">You</span>}
            {line.content}
          </p>
        ))}
        {dialog.thinking && (
          <p className="thinking" role="status">
            <span />
            {npc.name} is thinking…
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
          Your message
        </label>
        <input
          id="npc-message"
          value={text}
          maxLength={500}
          placeholder="Say something…"
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
          disabled={dialog.thinking}
        />
        <button
          type="submit"
          className="icon-button"
          aria-label="Send message"
          disabled={dialog.thinking || !text.trim()}
        >
          <Icon name="arrow" />
        </button>
      </form>
      <div className="conversation-footer">
        <span
          className={`source-label ${dialog.source ?? ''}`}
          title={
            dialog.source === 'live'
              ? 'Live NPC conversation'
              : dialog.source === 'fallback'
                ? 'Offline conversation'
                : 'Connecting with your neighbor…'
          }
        >
          {dialog.source === 'fallback' && 'Offline conversation'}
        </span>
        <button type="button" className="text-button" onClick={close}>
          Continue exploring
        </button>
      </div>
    </Dialog>
  )
}
