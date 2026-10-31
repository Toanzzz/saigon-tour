import { DEMO_QUEST, NPCS, SECRET_QUESTS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { type SubmitEvent, useEffect, useRef, useState } from 'react'
import {
  acceptQuest,
  chat,
  close,
  deliverOrVerify,
  deliverTeamDish,
  teamErrand,
} from '../core/actions'
import { net } from '../net/status'
import type { GameState } from '../state/game'
import { Dialog } from './dialog'
import { Icon } from './icons'

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
  const network = useSelector(net, (value) => value)
  const party = network.party
  const team = party?.quest
  const assignment = team?.assignments.find(
    (entry) => entry.playerId === network.selfId
  )
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
  const delivery =
    state.quest?.objective.type === 'DELIVER' &&
    state.quest.objective.npcId === dialog.npc &&
    (state.world.inventory[state.quest.objective.itemId] ?? 0) > 0
  const canVerify =
    state.quest && (state.quest.giverNpcId === dialog.npc || delivery)
  const secretQuest = Object.values(SECRET_QUESTS).find(
    (quest) => quest.giverNpcId === dialog.npc
  )
  const canHearSecret =
    secretQuest &&
    !state.quest &&
    !state.world.completedQuestIds.includes(secretQuest.id)
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
      eyebrow={npc.role}
      onClose={close}
      className="conversation"
    >
      <div className={`portrait portrait-${dialog.npc}`} aria-hidden="true">
        <span>{npc.name.split(' ').at(-1)?.slice(0, 1)}</span>
      </div>
      <div
        className="conversation-history"
        ref={historyRef}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {dialog.history.map((line) => (
          <p className={`speech ${line.role}`} key={messageKey(line)}>
            <span className="speaker">
              {line.role === 'user' ? 'You' : npc.name}
            </span>
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
      {!dialog.thinking && (
        <div className="conversation-actions">
          {((dialog.npc === 'hoa' &&
            !state.quest &&
            !state.world.completedQuestIds.includes(DEMO_QUEST.id)) ||
            canHearSecret) && (
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                void acceptQuest()
              }}
            >
              <Icon name="leaf" />
              {canHearSecret ? 'Hear a secret quest' : 'Help Cô Hoa'}
            </button>
          )}
          {canVerify && (
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                void deliverOrVerify()
              }}
            >
              <Icon name={delivery ? 'leaf' : 'check'} />
              {delivery ? 'Deliver the herbs' : 'Check my progress'}
            </button>
          )}
          {dialog.npc === 'hoa' &&
            party &&
            party.members.length >= 2 &&
            !team?.completed &&
            !state.world.completedQuestIds.includes('hoa-team-lunch') && (
              <button
                type="button"
                className="primary-button"
                disabled={network.connection !== 'connected'}
                onClick={() => {
                  void teamErrand()
                }}
              >
                <Icon name="users" />
                {team ? 'Check team errand' : 'Team errand'}
              </button>
            )}
          {dialog.npc === 'linh' &&
            assignment &&
            !assignment.delivered &&
            !team?.completed && (
              <button
                type="button"
                className="primary-button"
                disabled={network.connection !== 'connected'}
                onClick={() => {
                  void deliverTeamDish()
                }}
              >
                Deliver the {assignment.dish}
              </button>
            )}
        </div>
      )}
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
        <span className={`source-label ${dialog.source ?? ''}`}>
          {dialog.source === 'live'
            ? 'Live NPC conversation'
            : dialog.source === 'fallback'
              ? 'Offline conversation'
              : 'Connecting with your neighbor…'}
        </span>
        <button type="button" className="text-button" onClick={close}>
          Continue exploring
        </button>
      </div>
    </Dialog>
  )
}
