import {
  type AvatarBody,
  PlayerNameSchema,
  randomPlayerBody,
  randomPlayerName,
} from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { shallow } from '@tanstack/store'
import { useEffect, useState } from 'react'
import { saveProfile, signInWithMeta, signOut } from '@/shared/api/session'
import { m } from '@/shared/i18n'
import { game, notify, update } from '@/shared/state/game'
import { Glyph, Icon } from '@/shared/ui/icons'

/** Saves the chosen name and body before play; offline players keep them locally. */
export async function commitProfile(name: string, body: AvatarBody) {
  const parsed = PlayerNameSchema.safeParse(name)
  if (!parsed.success) return false
  update({ guestName: parsed.data, body })
  // The title toggle sets body into the store eagerly for the live preview, so
  // save unconditionally when online; the server write is idempotent.
  if (game.state.guestStatus !== 'online') return true
  try {
    await saveProfile(parsed.data, body)
    return true
  } catch {
    notify(m.toast_name_not_saved())
    return false
  }
}

export function TitleName({
  name,
  onName,
  body,
  onBody,
}: {
  name: string
  onName: (name: string) => void
  body: AvatarBody
  onBody: (body: AvatarBody) => void
}) {
  const { guestName, guestStatus } = useSelector(
    game,
    (s) => ({ guestName: s.guestName, guestStatus: s.guestStatus }),
    { compare: shallow }
  )
  useEffect(() => {
    if (guestName) onName(guestName)
  }, [guestName, onName])
  const valid = PlayerNameSchema.safeParse(name).success
  const loading = guestStatus === 'loading'
  const bodyLabel = body === 'man' ? m.body_man() : m.body_woman()
  const randomize = () => {
    const next = randomPlayerBody()
    onBody(next)
    onName(randomPlayerName(next))
  }
  return (
    <label className="title-name" htmlFor="player-name">
      <span>{m.title_your_name()}</span>
      <span className="title-name-row">
        <input
          id="player-name"
          value={name}
          maxLength={24}
          autoComplete="nickname"
          aria-invalid={!valid}
          disabled={loading}
          onChange={(event) => onName(event.target.value)}
        />
        <button
          type="button"
          className="title-gender"
          aria-label={`${m.title_body_toggle()} (${bodyLabel})`}
          title={`${m.title_body_toggle()} (${bodyLabel})`}
          disabled={loading}
          onClick={() => onBody(body === 'man' ? 'woman' : 'man')}
        >
          <Glyph name={body === 'man' ? 'male' : 'female'} size={26} />
        </button>
        <button
          type="button"
          className="title-dice"
          aria-label={m.title_random_name()}
          title={m.title_random_name()}
          disabled={loading}
          onClick={randomize}
        >
          <Icon name="dice" size={22} />
        </button>
      </span>
    </label>
  )
}

export function TitleAccount() {
  const { guestStatus, account, metaAvailable } = useSelector(
    game,
    (s) => ({
      guestStatus: s.guestStatus,
      account: s.account,
      metaAvailable: s.metaAvailable,
    }),
    { compare: shallow }
  )
  const [signingIn, setSigningIn] = useState(false)
  const meta = async () => {
    setSigningIn(true)
    try {
      await signInWithMeta()
    } catch {
      setSigningIn(false)
      notify(m.toast_meta_unavailable())
    }
  }
  const leave = async () => {
    await signOut().catch(() => {})
    location.reload()
  }
  if (account === 'meta')
    return (
      <p className="title-account">
        <span>{m.title_meta_saved()}</span>
        <button type="button" className="text-button" onClick={leave}>
          {m.title_sign_out()}
        </button>
      </p>
    )
  return (
    <p className="title-account">
      <span>{m.title_guest_saved()}</span>
      {metaAvailable && guestStatus === 'online' && (
        <button
          type="button"
          className="meta-button"
          disabled={signingIn}
          onClick={meta}
        >
          {signingIn ? m.title_meta_opening() : m.title_meta_continue()}
        </button>
      )}
    </p>
  )
}
