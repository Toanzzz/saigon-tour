import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readDemo } from '@/shared/runtime/demo-flag'
import { motion } from '@/shared/runtime/motion'

vi.mock('@/app/actions', () => ({
  restart: vi.fn(async () => true),
  start: vi.fn(),
}))
vi.mock('@/app/title-identity', () => ({
  commitProfile: vi.fn(async () => true),
}))
vi.mock('@/shared/audio', () => ({
  audio: { unlock: vi.fn(async () => {}) },
}))
vi.mock('@/shared/api/city', () => ({
  npcPosition: () => [10, 0, 20],
}))

import { restart, start } from '@/app/actions'
import { startDemo } from '@/app/start-demo'
import { commitProfile } from '@/app/title-identity'
import { audio } from '@/shared/audio'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(restart).mockResolvedValue(true)
  vi.mocked(commitProfile).mockResolvedValue(true)
  motion.teleport = null
})

describe('demo entry', () => {
  it('reads presence flags while respecting an explicit opt-out', () => {
    expect(readDemo('')).toBe(false)
    expect(readDemo('?demo')).toBe(true)
    expect(readDemo('?demo=1&debug=1')).toBe(true)
    expect(readDemo('?demo=0')).toBe(false)
  })
  it('unlocks before awaiting reset, then saves and starts by Hoa', async () => {
    const pending = startDemo('Lan', 'woman')
    expect(audio.unlock).toHaveBeenCalledOnce()
    expect(restart).toHaveBeenCalledOnce()
    expect(commitProfile).not.toHaveBeenCalled()
    expect(await pending).toBe(true)
    expect(commitProfile).toHaveBeenCalledWith('Lan', 'woman')
    expect(motion.teleport).toEqual([10, 23])
    expect(start).toHaveBeenCalledOnce()
  })
  it('keeps the title when reset fails', async () => {
    vi.mocked(restart).mockResolvedValue(false)
    expect(await startDemo('Lan', 'woman')).toBe(false)
    expect(commitProfile).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
    expect(motion.teleport).toBeNull()
  })
  it('keeps the title when the profile cannot be saved', async () => {
    vi.mocked(commitProfile).mockResolvedValue(false)
    expect(await startDemo('Lan', 'woman')).toBe(false)
    expect(start).not.toHaveBeenCalled()
    expect(motion.teleport).toBeNull()
  })
})
