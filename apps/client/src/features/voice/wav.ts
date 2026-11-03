export const VOICE_SAMPLE_RATE = 24000
export const VOICE_MAX_SECONDS = 15

/** PCM16 mono WAV, matching the transcription endpoint's verified input. */
export function encodeWav(samples: Float32Array): Blob {
  const length = Math.min(samples.length, VOICE_SAMPLE_RATE * VOICE_MAX_SECONDS)
  const bytes = new ArrayBuffer(44 + length * 2)
  const view = new DataView(bytes)
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++)
      view.setUint8(offset + i, value.charCodeAt(i))
  }
  text(0, 'RIFF')
  view.setUint32(4, 36 + length * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, VOICE_SAMPLE_RATE, true)
  view.setUint32(28, VOICE_SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, length * 2, true)
  for (let i = 0; i < length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i] ?? 0))
    view.setInt16(44 + i * 2, value * (value < 0 ? 32768 : 32767), true)
  }
  return new Blob([bytes], { type: 'audio/wav' })
}

/** Decode the browser's recording and resample before uploading. */
export async function recordingWav(recording: Blob): Promise<Blob> {
  const context = new AudioContext()
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer())
    const seconds = Math.min(decoded.duration, VOICE_MAX_SECONDS)
    if (!seconds) throw new Error('empty_audio')
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(seconds * VOICE_SAMPLE_RATE),
      VOICE_SAMPLE_RATE
    )
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    return encodeWav((await offline.startRendering()).getChannelData(0))
  } finally {
    await context.close()
  }
}
