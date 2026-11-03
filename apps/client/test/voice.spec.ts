import { afterEach, describe, expect, it, vi } from 'vitest'
import { recordMicrophone } from '@/features/voice/recorder'
import {
  ownVoiceResource,
  resetVoice,
  voiceGeneration,
  voiceStore,
} from '@/features/voice/store'
import { encodeWav } from '@/features/voice/wav'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
describe('voice WAV encoding', () => {
  it('writes PCM16 mono 24 kHz and clips samples without overflow', async () => {
    const blob = encodeWav(new Float32Array([-2, -1, 0, 1, 2]))
    const bytes = await blob.arrayBuffer()
    const view = new DataView(bytes)
    expect(blob.type).toBe('audio/wav')
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF')
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(24000)
    expect(view.getUint16(34, true)).toBe(16)
    expect([0, 1, 2, 3, 4].map((i) => view.getInt16(44 + i * 2, true))).toEqual(
      [-32768, -32768, 0, 32767, 32767]
    )
  })
  it('caps output at fifteen seconds', () => {
    expect(encodeWav(new Float32Array(24000 * 16)).size).toBe(
      44 + 24000 * 15 * 2
    )
  })
})
describe('voice lifecycle', () => {
  it('reset invalidates pending results and closes owned resources once', () => {
    const before = voiceGeneration()
    const cancel = vi.fn()
    ownVoiceResource(cancel)
    voiceStore.setState(() => ({ phase: 'recording' }))
    resetVoice()
    resetVoice()
    expect(voiceGeneration()).toBe(before + 2)
    expect(cancel).toHaveBeenCalledOnce()
    expect(voiceStore.state.phase).toBe('idle')
  })
  function media() {
    const track = { stop: vi.fn() }
    class Recorder {
      static isTypeSupported = () => true
      state = 'inactive'
      mimeType = 'audio/webm'
      ondataavailable?: (event: { data: Blob }) => void
      onstop?: () => void
      start() {
        this.state = 'recording'
      }
      stop() {
        this.state = 'inactive'
        this.ondataavailable?.({ data: new Blob(['audio']) })
        this.onstop?.()
      }
    }
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [track] }),
      },
    })
    vi.stubGlobal('MediaRecorder', Recorder)
    return track
  }
  it('stops tracks on completion and never retains cancelled audio', async () => {
    const track = media()
    const recording = await recordMicrophone(vi.fn())
    expect((await recording.stop()).size).toBeGreaterThan(0)
    expect(track.stop).toHaveBeenCalled()
    const cancelled = await recordMicrophone(vi.fn())
    cancelled.cancel()
    await expect(cancelled.stop()).rejects.toThrow('voice_cancelled')
  })
  it('requests automatic stop after fifteen seconds', async () => {
    vi.useFakeTimers()
    media()
    const autoStop = vi.fn()
    const recording = await recordMicrophone(autoStop)
    vi.advanceTimersByTime(15000)
    expect(autoStop).toHaveBeenCalledOnce()
    recording.cancel()
  })
})
