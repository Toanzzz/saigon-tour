import { useProgress } from '@react-three/drei'
import { PlayerNameSchema } from '@saigon/shared'
import { useMutation } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { shallow } from '@tanstack/store'
import { LanguageToggle, m } from '@/shared/i18n'
import { game, update } from '@/shared/state/game'
import { nameDraft, setNameDraft } from '@/shared/state/ui'
import { XRSessionButton, xrStore } from '@/shared/xr'
import { start } from './actions'
import { commitProfile, TitleAccount, TitleName } from './title-identity'
import { hasJourney, JourneySummary, NewJourneyButton } from './title-journey'

export function TitleScreen() {
  const { active, progress } = useProgress()
  const { guestName, guestStatus, returningGuest, body } = useSelector(
    game,
    (s) => ({
      guestName: s.guestName,
      guestStatus: s.guestStatus,
      returningGuest: s.returningGuest,
      body: s.body,
    }),
    { compare: shallow }
  )
  const continuing = useSelector(game, hasJourney)
  // The name draft is seeded from guestName centrally (installUiResets).
  const name = useSelector(nameDraft, (s) => s.name)
  const valid = PlayerNameSchema.safeParse(name).success
  const begin = useMutation({
    mutationFn: () => commitProfile(name, body),
    onSuccess: (saved) => {
      if (saved) start()
    },
  })
  return (
    <section className="title-screen" aria-label={m.title_welcome_label()}>
      <div className="title-content">
        <LanguageToggle />
        <h1>Sài Gòn</h1>
        <p className="title-subtitle">{m.title_subtitle()}</p>
        <p className="title-description">
          {returningGuest && guestName
            ? m.title_welcome_back({ name: guestName })
            : m.title_description()}
          {continuing && <JourneySummary />}
        </p>
        <div className="title-form">
          {!continuing && (
            <TitleName
              name={name}
              onName={setNameDraft}
              body={body}
              onBody={(next) => update({ body: next })}
            />
          )}
          <div className="title-actions">
            <button
              type="button"
              className="primary-button title-start"
              disabled={
                active || guestStatus === 'loading' || !valid || begin.isPending
              }
              onClick={() => begin.mutate()}
            >
              {active ? (
                m.title_loading({ percent: Math.round(progress) })
              ) : guestStatus === 'loading' ? (
                m.title_finding_journey()
              ) : continuing ? (
                <span className="title-continue">
                  {m.title_continue()}
                  <small>
                    {m.title_continue_as({ name: guestName ?? '' })}
                  </small>
                </span>
              ) : (
                m.title_start()
              )}
            </button>
            <XRSessionButton store={xrStore} />
          </div>
          {continuing && <NewJourneyButton className="title-new-journey" />}
          <TitleAccount />
        </div>
        <p className="title-controls desktop-only">
          <span>
            <kbd>W A S D</kbd> {m.title_controls_move()}
          </span>
          <span>
            <kbd>{m.controls_drag()}</kbd> {m.controls_look()}
          </span>
          <span>
            <kbd>E</kbd> {m.title_controls_hello()}
          </span>
        </p>
        <p className="title-controls touch-only">{m.title_controls_touch()}</p>
      </div>
      <nav className="title-legal" aria-label={m.title_legal()}>
        <a href="/legal/privacy.html">{m.title_privacy()}</a>
        <a href="/legal/data-deletion.html">{m.title_data_deletion()}</a>
      </nav>
    </section>
  )
}
