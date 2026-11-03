import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef } from 'react'
import { m } from '@/shared/i18n'
import { voiceClips } from './clips'

export function VoicePlayback({ messageId }: { messageId?: string }) {
  const url = useSelector(voiceClips, (clips) =>
    messageId ? clips.get(messageId) : undefined
  )
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (!url) return
    const audio = ref.current
    return () => {
      audio?.pause()
      audio?.removeAttribute('src')
      audio?.load()
    }
  }, [url])
  if (!url) return null
  return (
    // biome-ignore lint/a11y/useMediaCaption: The message's visible transcript sits immediately above this recording.
    <audio
      ref={ref}
      className="voice-playback"
      src={url}
      controls
      preload="metadata"
      aria-label={m.voice_replay()}
    />
  )
}
