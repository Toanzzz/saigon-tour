import { PlayerNameSchema, randomPlayerName } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { renamePlayer, signInWithMeta, signOut } from '@/shared/api/session'
import { m } from '@/shared/i18n'
import { game, notify, update } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'

/** Saves the chosen name before play; offline players keep it locally. */
export async function commitPlayerName(name: string) {
  const parsed = PlayerNameSchema.safeParse(name)
  if (!parsed.success) return false
  if (parsed.data === game.state.guestName) return true
  update({ guestName: parsed.data })
  if (game.state.guestStatus !== 'online') return true
  try {
    await renamePlayer(parsed.data)
    return true
  } catch {
    notify(m.toast_name_not_saved())
    return false
  }
}

export function TitleName({
  name,
  onName,
}: {
  name: string
  onName: (name: string) => void
}) {
  const { guestName, guestStatus } = useSelector(game, (s) => s)
  useEffect(() => {
    if (guestName) onName(guestName)
  }, [guestName, onName])
  const valid = PlayerNameSchema.safeParse(name).success
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
          disabled={guestStatus === 'loading'}
          onChange={(event) => onName(event.target.value)}
        />
        <button
          type="button"
          className="title-dice"
          aria-label={m.title_random_name()}
          title={m.title_random_name()}
          disabled={guestStatus === 'loading'}
          onClick={() => onName(randomPlayerName())}
        >
          <Icon name="dice" size={22} />
        </button>
      </span>
    </label>
  )
}

export function TitleAccount() {
  const { guestStatus, account, metaAvailable } = useSelector(game, (s) => s)
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
