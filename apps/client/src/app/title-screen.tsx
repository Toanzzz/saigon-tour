import { useProgress } from '@react-three/drei'
import { PlayerNameSchema } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { game } from '@/shared/state/game'
import { XRSessionButton, xrStore } from '@/shared/xr'
import { start } from './actions'
import { commitPlayerName, TitleAccount, TitleName } from './title-identity'
import {
  hasJourney,
  JourneySummary,
  NewJourneyButton,
  PlayingAs,
} from './title-journey'

export function TitleScreen() {
  const { active, progress } = useProgress()
  const { guestName, guestStatus, returningGuest } = useSelector(game, (s) => s)
  const continuing = useSelector(game, hasJourney)
  const [name, setName] = useState('')
  const [starting, setStarting] = useState(false)
  useEffect(() => {
    if (guestName) setName(guestName)
  }, [guestName])
  const valid = PlayerNameSchema.safeParse(name).success
  const begin = async () => {
    setStarting(true)
    const saved = await commitPlayerName(name)
    setStarting(false)
    if (saved) start()
  }
  return (
    <section className="title-screen" aria-label="Welcome to Sài Gòn">
      <div className="title-content">
        <h1>Sài Gòn</h1>
        <p className="title-subtitle">A little journey</p>
        <p className="title-description">
          {returningGuest && guestName
            ? `Welcome back, ${guestName}`
            : 'Meet a neighbor, lend a hand, and let the city surprise you.'}
          {continuing && <JourneySummary />}
        </p>
        <div className="title-form">
          {continuing ? (
            <PlayingAs name={name} onName={setName} />
          ) : (
            <TitleName name={name} onName={setName} />
          )}
          <div className="title-actions">
            <button
              type="button"
              className="primary-button title-start"
              disabled={
                active || guestStatus === 'loading' || !valid || starting
              }
              onClick={begin}
            >
              {active
                ? `Opening the neighborhood… ${Math.round(progress)}%`
                : guestStatus === 'loading'
                  ? 'Finding your journey…'
                  : continuing
                    ? 'Continue journey'
                    : 'Start exploring'}
            </button>
            <XRSessionButton store={xrStore} />
          </div>
          {continuing && <NewJourneyButton name={name} />}
          <TitleAccount />
        </div>
        <p className="title-controls desktop-only">
          <span>
            <kbd>W A S D</kbd> move
          </span>
          <span>
            <kbd>Drag</kbd> look
          </span>
          <span>
            <kbd>E</kbd> say hello
          </span>
        </p>
        <p className="title-controls touch-only">
          Use the thumbstick to move. Drag the city to look around.
        </p>
      </div>
      <nav className="title-legal" aria-label="Legal">
        <a href="/legal/privacy.html">Privacy Policy</a>
        <a href="/legal/data-deletion.html">User Data Deletion</a>
      </nav>
    </section>
  )
}
