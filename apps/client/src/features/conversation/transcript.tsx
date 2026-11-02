import { NPCS, npcActivity } from '@saigon/shared'
import { Fragment, useEffect, useRef } from 'react'
import { getLocale, m, npcLabel } from '@/shared/i18n'
import type { ChatMessage, Dialogue } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { NpcAvatar } from './npc-avatar'

const date = (at?: string) =>
  at && Number.isFinite(Date.parse(at)) ? new Date(at) : null
const day = (at?: string) => date(at)?.toLocaleDateString(getLocale())
export function MessageTime({ at }: { at?: string }) {
  const value = date(at)
  if (!value)
    return (
      <span className="message-time">
        <span className="sr-only">{m.chat_time_unknown()}</span>
        <span aria-hidden="true">—</span>
      </span>
    )
  return (
    <time
      className="message-time"
      dateTime={value.toISOString()}
      title={value.toLocaleString(getLocale())}
    >
      <span className="sr-only">{value.toLocaleString(getLocale())}</span>
      <span aria-hidden="true">
        {value.toLocaleTimeString(getLocale(), {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        })}
      </span>
    </time>
  )
}

function Message({ line, npc }: { line: ChatMessage; npc: Dialogue['npc'] }) {
  return line.role === 'assistant' ? (
    <div className="speech-row">
      <NpcAvatar id={npc} size="sm" />
      <div className="speech assistant">
        <p>{line.content}</p>
        <MessageTime at={line.at} />
      </div>
    </div>
  ) : (
    <div className="speech user">
      <span className="speaker">{m.map_you()}</span>
      <p>{line.content}</p>
      <MessageTime at={line.at} />
    </div>
  )
}

export function Transcript({ dialog }: { dialog: Dialogue }) {
  const ref = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  const encounter = useRef('')
  const earlierCount = Math.min(dialog.earlierCount ?? 0, dialog.history.length)
  useEffect(() => {
    const fresh = encounter.current !== dialog.requestId
    encounter.current = dialog.requestId
    if (fresh) following.current = true
    const frame = requestAnimationFrame(() => {
      if (ref.current && following.current)
        ref.current.scrollTop = ref.current.scrollHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [dialog])
  const activity = dialog.activity ?? npcActivity(dialog.npc)
  const scene = activity.text[getLocale()].replace(
    '{name}',
    npcLabel(dialog.npc)
  )
  const row = (line: ChatMessage, index: number) => {
    const previous =
      index === earlierCount ? dialog.openedAt : dialog.history[index - 1]?.at
    const label = day(line.at)
    return (
      <Fragment key={line.id ?? `${index}:${line.role}:${line.at ?? ''}`}>
        {label && label !== day(previous) && (
          <div className="chat-date">{label}</div>
        )}
        <Message line={line} npc={dialog.npc} />
      </Fragment>
    )
  }
  return (
    <div
      className="conversation-history"
      ref={ref}
      role="log"
      aria-label={m.chat_log()}
      aria-live="polite"
      onScroll={() => {
        const el = ref.current
        if (el)
          following.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 48
      }}
    >
      {dialog.history.slice(0, earlierCount).map(row)}
      <div className="encounter-divider">
        {m.chat_new_encounter()} · <MessageTime at={dialog.openedAt} />
      </div>
      {day(dialog.openedAt) &&
        day(dialog.openedAt) !== day(dialog.history[earlierCount - 1]?.at) && (
          <div className="chat-date">{day(dialog.openedAt)}</div>
        )}
      <aside
        className="activity-scene"
        data-activity={activity.id}
        aria-label={m.chat_scene_label()}
      >
        <span className="activity-stamp">
          <Icon name="leaf" size={18} />
        </span>
        <div className="activity-scene-heading">
          <span>{m.chat_scene_label()}</span>
          <MessageTime at={dialog.openedAt} />
        </div>
        <p>{scene}</p>
      </aside>
      {dialog.history
        .slice(earlierCount)
        .map((line, index) => row(line, earlierCount + index))}
      {dialog.thinking && dialog.streamingText && (
        <div className="speech-row">
          <NpcAvatar id={dialog.npc} size="sm" />
          <div className="speech assistant">
            <p>{dialog.streamingText}</p>
          </div>
        </div>
      )}
      {dialog.thinking && !dialog.streamingText && (
        <p className="thinking" role="status">
          <span />
          {m.chat_thinking({ name: NPCS[dialog.npc].name })}
        </p>
      )}
    </div>
  )
}
