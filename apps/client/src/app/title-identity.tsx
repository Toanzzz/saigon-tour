import { PlayerNameSchema, randomPlayerName } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { renamePlayer, signInWithMeta, signOut } from '@/shared/api/session'
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
    notify('That name could not be saved. Try another one.')
    return false
  }
}

export function TitleIdentity({
  name,
  onName,
}: {
  name: string
  onName: (name: string) => void
}) {
  const { guestName, guestStatus, account, metaAvailable } = useSelector(
    game,
    (s) => s
  )
  const [signingIn, setSigningIn] = useState(false)
  useEffect(() => {
    if (guestName) onName(guestName)
  }, [guestName, onName])
  const valid = PlayerNameSchema.safeParse(name).success
  const meta = async () => {
    setSigningIn(true)
    try {
      await signInWithMeta()
    } catch {
      setSigningIn(false)
      notify('Meta sign-in is unavailable right now.')
    }
  }
  const leave = async () => {
    await signOut().catch(() => {})
    location.reload()
  }
  return (
    <div className="title-identity">
      <label className="title-name" htmlFor="player-name">
        <span>Your name</span>
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
            aria-label="Pick another random name"
            title="Pick another random name"
            disabled={guestStatus === 'loading'}
            onClick={() => onName(randomPlayerName())}
          >
            <Icon name="dice" size={22} />
          </button>
        </span>
      </label>
      {account === 'meta' ? (
        <p className="title-account">
          Progress saved to your Meta account.{' '}
          <button type="button" className="text-button" onClick={leave}>
            Sign out
          </button>
        </p>
      ) : (
        <div className="title-account">
          <span>Playing as a guest on this device.</span>
          {metaAvailable && guestStatus === 'online' && (
            <button
              type="button"
              className="meta-button"
              disabled={signingIn}
              onClick={meta}
            >
              {signingIn ? 'Opening Meta…' : 'Continue with Meta'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
