import { useMutation, useQuery } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { m } from '@/shared/i18n'
import { game, notify } from '@/shared/state/game'
import { voiceAvailable } from './api'
import { finishVoice, startVoice } from './controller'
import { supportsVoice } from './recorder'
import { resetVoice, voiceStore } from './store'
import './voice.css'

function failure(empty = false) {
  notify(empty ? m.voice_empty() : m.voice_failed())
  document.querySelector<HTMLInputElement>('#npc-message')?.focus()
}
export function MicButton({
  thinking,
  onTranscript,
}: {
  thinking: boolean
  onTranscript: (text: string) => unknown
}) {
  const supported = supportsVoice()
  const reducedMotion = useSelector(game, (state) => state.reducedMotion)
  const status = useQuery({
    queryKey: ['voice', 'available'],
    queryFn: voiceAvailable,
    enabled: supported,
    staleTime: 60000,
    retry: false,
  })
  const recording = useSelector(
    voiceStore,
    (state) => state.phase === 'recording'
  )
  const finish = useMutation({
    mutationFn: finishVoice,
    onSuccess: (result) => {
      if (result === null || !result.current()) return
      const { text } = result
      if (!text.trim()) failure(true)
      else void onTranscript(text)
    },
    onError: () => {
      resetVoice()
      failure()
    },
  })
  const start = useMutation({
    mutationFn: () => startVoice(() => finish.mutate()),
    onError: () => {
      resetVoice()
      failure()
    },
  })
  if (!supported || !status.data || status.isError) return null
  const busy = start.isPending || finish.isPending
  const label = finish.isPending
    ? m.voice_transcribing()
    : recording
      ? m.voice_stop()
      : m.voice_start()
  return (
    <button
      type="button"
      className={`icon-button voice-button${recording ? ' is-recording' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={recording}
      data-reduced-motion={reducedMotion}
      disabled={thinking || busy}
      onClick={() => (recording ? finish.mutate() : start.mutate())}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1M12 18v4m-3 0h6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
