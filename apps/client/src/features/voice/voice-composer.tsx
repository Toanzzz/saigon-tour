import { useMutation, useQuery } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { m } from '@/shared/i18n'
import { notify } from '@/shared/state/game'
import { chatDraft, setChatText } from '@/shared/state/ui'
import { Icon } from '@/shared/ui/icons'
import { voiceAvailable } from './api'
import { finishVoice, startVoice } from './controller'
import { supportsVoice } from './recorder'
import { resetVoice, voiceStore } from './store'
import { VoiceWaveform } from './waveform'
import './voice.css'

function failure(empty = false) {
  notify(empty ? m.voice_empty() : m.voice_failed())
  document.querySelector<HTMLInputElement>('#npc-message')?.focus()
}

export function VoiceComposer({
  thinking,
  onSend,
}: {
  thinking: boolean
  onSend: (text: string, recording?: Blob) => unknown
}) {
  const text = useSelector(chatDraft, (state) => state.text)
  const phase = useSelector(voiceStore, (state) => state.phase)
  const supported = supportsVoice()
  const status = useQuery({
    queryKey: ['voice', 'available'],
    queryFn: voiceAvailable,
    enabled: supported,
    staleTime: 60000,
    retry: false,
  })
  const finish = useMutation({
    mutationFn: finishVoice,
    onSuccess: (result) => {
      if (result === null || !result.current()) return
      if (!result.text.trim()) failure(true)
      else void onSend(result.text, result.recording)
    },
    onError: () => {
      resetVoice()
      failure()
    },
  })
  const begin = useMutation({
    mutationFn: startVoice,
    onError: () => {
      resetVoice()
      failure()
    },
  })
  const listening = phase !== 'idle'
  const busy = thinking || finish.isPending
  const cancel = () => {
    resetVoice()
    begin.reset()
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>('#npc-message')?.focus()
    )
  }
  return (
    <form
      className="conversation-input"
      onSubmit={(event) => {
        event.preventDefault()
        if (busy) return
        if (listening) {
          if (phase !== 'requesting') finish.mutate()
        } else if (text.trim()) {
          setChatText('')
          void onSend(text)
        }
      }}
    >
      {listening ? (
        <VoiceWaveform
          ready={phase === 'ready'}
          connecting={phase === 'requesting'}
        />
      ) : (
        <>
          <label className="sr-only" htmlFor="npc-message">
            {m.chat_your_message()}
          </label>
          <input
            id="npc-message"
            value={text}
            maxLength={500}
            placeholder={
              finish.isPending ? m.voice_transcribing() : m.chat_placeholder()
            }
            autoComplete="off"
            onChange={(event) => setChatText(event.target.value)}
            disabled={busy}
          />
        </>
      )}
      {(listening || (supported && status.data && !status.isError)) && (
        <button
          type="button"
          className={`icon-button voice-button${listening ? ' is-listening' : ''}`}
          aria-label={listening ? m.voice_cancel() : m.voice_start()}
          title={listening ? m.voice_cancel() : m.voice_start()}
          aria-pressed={listening}
          disabled={busy}
          onClick={() => (listening ? cancel() : begin.mutate())}
        >
          {listening ? (
            <Icon name="close" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1M12 18v4m-3 0h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      )}
      <button
        type="submit"
        className="icon-button"
        aria-label={listening ? m.voice_send() : m.chat_send()}
        disabled={
          busy || phase === 'requesting' || (!listening && !text.trim())
        }
      >
        <Icon name="arrow" />
      </button>
    </form>
  )
}
