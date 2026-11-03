import { game } from '@/shared/state/game'
import { transcribeVoice } from './api'
import { recordMicrophone, type VoiceRecording } from './recorder'
import { ownVoiceResource, voiceGeneration, voiceStore } from './store'
import { recordingWav } from './wav'

let active: VoiceRecording | null = null
let release: (() => void) | undefined
export async function startVoice(autoStop: () => void) {
  const generation = voiceGeneration()
  const recording = await recordMicrophone(autoStop).catch((error) => {
    if (generation !== voiceGeneration()) return null
    throw error
  })
  if (!recording) return
  if (generation !== voiceGeneration()) {
    recording.cancel()
    return
  }
  active = recording
  release = ownVoiceResource(() => {
    recording.cancel()
    active = null
  })
  voiceStore.setState(() => ({ phase: 'recording' }))
}
export async function finishVoice() {
  const recording = active
  if (!recording) return null
  const generation = voiceGeneration()
  const sessionId = game.state.sessionId
  const requestId = game.state.dialogue?.requestId
  const current = () =>
    generation === voiceGeneration() &&
    sessionId === game.state.sessionId &&
    requestId === game.state.dialogue?.requestId &&
    game.state.screen === 'playing'
  const abort = new AbortController()
  const releaseRequest = ownVoiceResource(() => abort.abort())
  const releaseRecording = release
  release = undefined
  active = null
  voiceStore.setState(() => ({ phase: 'idle' }))
  try {
    const blob = await recording.stop()
    releaseRecording?.()
    const wav = await recordingWav(blob)
    if (!current()) return null
    const text = await transcribeVoice(wav, abort.signal)
    return current() ? { text, current } : null
  } catch (error) {
    if (!current()) return null
    throw error
  } finally {
    releaseRecording?.()
    releaseRequest()
  }
}
