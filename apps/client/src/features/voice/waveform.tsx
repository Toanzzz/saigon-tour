import { useSelector } from '@tanstack/react-store'
import { m } from '@/shared/i18n'
import { voiceMeter } from './store'

const BARS = Array.from({ length: 24 }, (_, index) => `sample-${index}`)
export function VoiceWaveform({
  ready,
  connecting,
}: {
  ready: boolean
  connecting: boolean
}) {
  const meter = useSelector(voiceMeter, (state) => state)
  const label = connecting
    ? m.voice_connecting()
    : ready
      ? m.voice_ready()
      : m.voice_listening()
  return (
    <div className="voice-waveform" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="voice-wave-bars" aria-hidden="true">
        {BARS.map((id, index) => (
          <span
            key={id}
            style={{ height: `${4 + (meter.levels[index] ?? 0) * 26}px` }}
          />
        ))}
      </div>
      <span className="voice-duration" aria-hidden="true">
        0:{String(meter.seconds).padStart(2, '0')}
      </span>
    </div>
  )
}
