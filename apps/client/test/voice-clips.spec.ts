import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  confirmVoiceMessage,
  rememberVoice,
  resetVoiceClips,
  voiceClips,
} from '@/features/voice/clips'

afterEach(() => {
  resetVoiceClips()
  vi.restoreAllMocks()
})

describe('session voice attachments', () => {
  it('transfers optimistic audio to the confirmed server message id', () => {
    rememberVoice('client-id', new Blob(['original']))
    const url = voiceClips.state.get('client-id')
    confirmVoiceMessage('client-id', 'server-hash')
    expect(voiceClips.state.has('client-id')).toBe(false)
    expect(voiceClips.state.get('server-hash')).toBe(url)
  })
  it('releases replaced and evicted recordings and clears the journey', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    rememberVoice('first', new Blob(['original']))
    const first = voiceClips.state.get('first')
    rememberVoice('first', new Blob(['replacement']))
    expect(revoke).toHaveBeenCalledWith(first)
    const replacement = voiceClips.state.get('first')
    for (let index = 0; index < 20; index++)
      rememberVoice(`message-${index}`, new Blob(['audio']))
    expect(voiceClips.state.size).toBe(20)
    expect(voiceClips.state.has('first')).toBe(false)
    expect(revoke).toHaveBeenCalledWith(replacement)
    const retained = [...voiceClips.state.values()]
    resetVoiceClips()
    expect(voiceClips.state.size).toBe(0)
    for (const url of retained) expect(revoke).toHaveBeenCalledWith(url)
  })
})
