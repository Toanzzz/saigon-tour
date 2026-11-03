import { TranscribeResponseSchema, VoiceStatusSchema } from '@saigon/shared'
import { apiUrl, authorizationHeaders } from '@/shared/api/transport'
import { getLocale } from '@/shared/i18n'

export async function voiceAvailable() {
  const response = await fetch(apiUrl('/voice/status'), {
    credentials: 'include',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) return false
  return VoiceStatusSchema.parse(await response.json()).available
}
export async function transcribeVoice(audio: Blob, signal: AbortSignal) {
  const form = new FormData()
  form.set('audio', audio, 'recording.wav')
  form.set('locale', getLocale())
  const response = await fetch(apiUrl('/voice/transcribe'), {
    method: 'POST',
    headers: authorizationHeaders(),
    credentials: 'include',
    body: form,
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
  })
  if (!response.ok) throw new Error('voice_unavailable')
  return TranscribeResponseSchema.parse(await response.json()).text
}
