import type { Emote } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { close } from '@/app/actions'
import { presenceView } from '@/shared/api/presence-view'
import { sendEmote, sendParty } from '@/shared/api/socket'
import { type NetState, net, updateNet } from '@/shared/api/status'
import { m } from '@/shared/i18n'
import { update } from '@/shared/state/game'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'
import { useXRPresenting } from '@/shared/xr'

function connectionLabel(status: NetState['connection']) {
  const labels: Record<NetState['connection'], () => string> = {
    offline: m.connection_offline,
    connecting: m.connection_connecting,
    connected: m.connection_connected,
    reconnecting: m.connection_reconnecting,
    waiting: m.connection_waiting,
  }
  return labels[status]()
}

export function PeopleButton() {
  const state = useSelector(net, (value) => value)
  const xr = useXRPresenting()
  if (xr) return null
  return (
    <button
      type="button"
      className="icon-button people-button"
      aria-label={m.people_nearby()}
      title={m.people_nearby_title({
        status: connectionLabel(state.connection),
      })}
      onClick={() => update({ panel: 'people' })}
    >
      <Icon name="users" />
      <span>{state.players.length}</span>
      <i className={`connection-dot ${state.connection}`} aria-hidden="true" />
    </button>
  )
}
export function PeoplePanel() {
  const state = useSelector(net, (value) => value)
  return (
    <Dialog
      title={
        state.room
          ? m.people_on_room({ room: state.room })
          : m.people_on_street()
      }
      onClose={close}
    >
      <p role="status" className="connection-copy">
        {state.connection === 'connected'
          ? m.people_sharing()
          : state.connection === 'waiting'
            ? m.people_waiting()
            : m.people_reconnecting()}
      </p>
      {state.party && (
        <section className="party-roster" aria-label={m.people_your_party()}>
          <h3>{m.people_party_count({ count: state.party.members.length })}</h3>
          <ul>
            {state.party.members.map((member) => (
              <li key={member.id}>
                {member.name}
                {member.id === state.selfId ? ` ${m.people_you_suffix()}` : ''}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="text-button"
            disabled={state.connection !== 'connected'}
            onClick={() => sendParty({ type: 'party-leave' })}
          >
            {m.people_leave()}
          </button>
        </section>
      )}
      <ul className="people-list">
        {state.players.map((player) => (
          <li key={player.id}>
            <span
              className="player-color"
              style={{ background: player.color }}
            />
            <strong>{player.name}</strong>
            {player.id === state.selfId && <span>{m.map_you()}</span>}
            {player.id !== state.selfId &&
              !state.party?.members.some(
                (member) => member.id === player.id
              ) && (
                <button
                  type="button"
                  className="text-button"
                  disabled={
                    state.connection !== 'connected' ||
                    (state.party?.members.length ?? 0) >= 4
                  }
                  aria-label={m.people_invite_name({ name: player.name })}
                  onClick={() => {
                    if (
                      sendParty({ type: 'party-invite', targetId: player.id })
                    )
                      updateNet({ emotesOpen: false })
                  }}
                >
                  {m.people_invite()}
                </button>
              )}
          </li>
        ))}
      </ul>
      {!state.players.length && <p>{m.people_empty()}</p>}
      <p className="muted-copy">{m.people_help()}</p>
    </Dialog>
  )
}
const choices: { emote: Emote; label: () => string }[] = [
  { emote: 'wave', label: m.emote_wave_choice },
  { emote: 'hello', label: m.emote_hello },
  { emote: 'thanks', label: m.emote_thanks },
  { emote: 'follow-me', label: m.emote_follow },
]
export function EmoteControls() {
  const state = useSelector(net, (value) => value)
  const hasVisiblePlayer = useSelector(
    presenceView,
    (value) => value.hasVisiblePlayer
  )
  const xr = useXRPresenting()
  if (xr || !hasVisiblePlayer) return null
  return (
    <div className="emote-controls">
      <button
        type="button"
        className="emote-opener"
        aria-label={m.emote_open()}
        aria-expanded={state.emotesOpen}
        onClick={() => updateNet({ emotesOpen: !state.emotesOpen })}
      >
        <span aria-hidden="true">👋</span>
        <span>{m.emote_say_hello()}</span>
        <kbd>Q</kbd>
      </button>
      {state.emotesOpen && (
        <fieldset className="emote-popover" aria-label={m.emote_choose()}>
          {choices.map(({ emote, label }) => (
            <button
              key={emote}
              type="button"
              disabled={state.connection !== 'connected'}
              onClick={() => {
                if (sendEmote(emote)) updateNet({ emotesOpen: false })
              }}
            >
              {label()}
            </button>
          ))}
          {state.connection !== 'connected' && (
            <span>{m.emote_connecting()}</span>
          )}
        </fieldset>
      )}
    </div>
  )
}
