import { describe, expect, it } from 'vitest'
import { NpcScheduler } from '@/features/realtime'

describe('NPC scheduler', () => {
  it('wakes only queued NPCs, within budget and cooldown, and not while suppressed', async () => {
    const woke: string[] = []
    const scheduler = new NpcScheduler(
      async ({ npcId }) => void woke.push(npcId),
      1000,
      2
    )
    scheduler.notify('hoa', 'player-nearby')
    scheduler.notify('tam', 'world-event')
    scheduler.notify('ba', 'schedule')
    expect(await scheduler.tick(5000)).toHaveLength(2)
    expect(await scheduler.tick(5100)).toHaveLength(1)
    scheduler.notify('hoa', 'player-nearby')
    expect(await scheduler.tick(5200)).toHaveLength(0)
    scheduler.suppress(true)
    expect(await scheduler.tick(9000)).toHaveLength(0)
    scheduler.suppress(false)
    expect(await scheduler.tick(9000)).toHaveLength(1)
    expect(woke).toEqual(['hoa', 'tam', 'ba', 'hoa'])
  })
})
