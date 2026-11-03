import { VOICE_MAX_SECONDS } from './wav'

export interface VoiceRecording {
  stop: () => Promise<Blob>
  cancel: () => void
}
export function supportsVoice() {
  return Boolean(
    typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined' &&
      typeof AudioContext !== 'undefined' &&
      typeof OfflineAudioContext !== 'undefined'
  )
}

export async function recordMicrophone(
  autoStop: () => void
): Promise<VoiceRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  let recorder: MediaRecorder
  try {
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ].find((type) => MediaRecorder.isTypeSupported(type))
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  } catch (error) {
    for (const track of stream.getTracks()) track.stop()
    throw error
  }
  const chunks: Blob[] = []
  let cancelled = false
  let stopping = false
  let resolve: (value: Blob) => void
  let reject: (error: Error) => void
  const stopped = new Promise<Blob>((yes, no) => {
    resolve = yes
    reject = no
  })
  // Cancellation can precede a consumer awaiting stop().
  void stopped.catch(() => {})
  const cleanup = () => {
    clearTimeout(timer)
    for (const track of stream.getTracks()) track.stop()
  }
  recorder.ondataavailable = (event) => {
    if (!cancelled && event.data.size) chunks.push(event.data)
  }
  recorder.onstop = () => {
    cleanup()
    if (cancelled) reject(new Error('voice_cancelled'))
    else resolve(new Blob(chunks, { type: recorder.mimeType }))
    chunks.length = 0
  }
  recorder.onerror = () => {
    cleanup()
    reject(new Error('recording_failed'))
  }
  const timer = setTimeout(autoStop, VOICE_MAX_SECONDS * 1000)
  try {
    recorder.start()
  } catch (error) {
    cleanup()
    throw error
  }
  return {
    stop: () => {
      if (!stopping && recorder.state !== 'inactive') {
        stopping = true
        recorder.stop()
      }
      return stopped
    },
    cancel: () => {
      cancelled = true
      chunks.length = 0
      cleanup()
      if (recorder.state !== 'inactive') recorder.stop()
    },
  }
}
