import { beforeEach, describe, expect, it, vi } from 'vitest'
import { transcribeVoice } from '@/features/voice/api'
import { finishVoice, startVoice } from '@/features/voice/controller'
import { recordMicrophone } from '@/features/voice/recorder'
import { resetVoice, voiceStore } from '@/features/voice/store'
import { game, initialState, update } from '@/shared/state/game'

vi.hoisted(() => vi.resetModules())
vi.mock('@/features/voice/api', () => ({ transcribeVoice: vi.fn() }))
vi.mock('@/features/voice/recorder', () => ({ recordMicrophone: vi.fn() }))
vi.mock('@/features/voice/wav', () => ({
  recordingWav: vi.fn(async (blob) => blob),
}))
const cancel = vi.fn()
beforeEach(() => {
  resetVoice()
  vi.clearAllMocks()
  game.setState(() => ({
    ...initialState(),
    screen: 'playing',
    dialogue: {
      npc: 'hoa',
      requestId: 'hoa-encounter',
      thinking: false,
      source: null,
      history: [],
    },
  }))
  vi.mocked(recordMicrophone).mockResolvedValue({
    stop: async () => new Blob(['wav']),
    cancel,
  })
})
describe('voice encounter ownership', () => {
  it('returns a transcript only to the captured encounter', async () => {
    vi.mocked(transcribeVoice).mockResolvedValue('Hello')
    await startVoice()
    expect(voiceStore.state.phase).toBe('recording')
    const result = await finishVoice()
    expect(result?.text).toBe('Hello')
    expect(result?.recording).toBeInstanceOf(Blob)
    expect(result?.current()).toBe(true)
    update({ dialogue: null })
    expect(result?.current()).toBe(false)
  })
  it('holds the fifteen-second recording for Send without uploading', async () => {
    vi.mocked(transcribeVoice).mockResolvedValue('Hello')
    await startVoice()
    vi.mocked(recordMicrophone).mock.calls[0]?.[0]()
    await vi.waitFor(() => expect(voiceStore.state.phase).toBe('ready'))
    expect(transcribeVoice).not.toHaveBeenCalled()
    expect((await finishVoice())?.text).toBe('Hello')
  })
  it('discards an upload result after reset or an NPC switch', async () => {
    let done!: (text: string) => void
    vi.mocked(transcribeVoice).mockReturnValue(
      new Promise((resolve) => {
        done = resolve
      })
    )
    await startVoice()
    const pending = finishVoice()
    await vi.waitFor(() => expect(transcribeVoice).toHaveBeenCalledOnce())
    resetVoice()
    update({ dialogue: null })
    done('A stale message')
    expect(await pending).toBeNull()
    expect(vi.mocked(transcribeVoice).mock.calls[0]?.[1].aborted).toBe(true)
  })
  it('closes a permission result arriving after the encounter ends', async () => {
    let grant!: (value: Awaited<ReturnType<typeof recordMicrophone>>) => void
    vi.mocked(recordMicrophone).mockReturnValue(
      new Promise((resolve) => {
        grant = resolve
      })
    )
    const pending = startVoice()
    resetVoice()
    grant({ stop: async () => new Blob(), cancel })
    await pending
    expect(cancel).toHaveBeenCalledOnce()
    expect(voiceStore.state.phase).toBe('idle')
  })
})
