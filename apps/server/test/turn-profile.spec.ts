import { describe, expect, it } from 'vitest'
import { isCasualTurn } from '@/features/npc/turn-profile'
import { ask, live, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()

describe('casual NPC context and stable prompt prefix', () => {
  it.each(['What should I eat?', 'Tell me a market story', 'Có món gì ngon?'])(
    'uses a compact toolset for %s',
    async (message) => {
      const seen: {
        messages: { role: string; content: string }[]
        tools: { function: { name: string } }[]
      }[] = []
      const harness = ctx.fx.harness(
        live,
        scripted([{ text: 'A bowl of soup.' }], seen)
      )
      await harness.interact('hoa', ask(message), ctx.playerId)
      expect(seen[0]?.tools.map((tool) => tool.function.name)).toEqual([
        'adjustFriendliness',
        'rememberPlayerFact',
      ])
      const system = JSON.stringify(
        seen[0]?.messages.filter((entry) => entry.role === 'system')
      )
      expect(system).not.toContain('Example valid quest spec')
      expect(system).not.toContain('Shared city snapshot')
      expect(system).not.toContain('Active quests:')
    }
  )

  it('keeps the stable prefix identical across changing world state', async () => {
    const seen: { messages: { role: string; content: string }[] }[] = []
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Soup today.' }], seen)
    )
    await harness.interact('hoa', ask('What should I eat?'), ctx.playerId)
    const guest = await ctx.fx.guest()
    await harness.interact(
      'hoa',
      ask('What should I eat?', {
        worldContext: {
          playerLocation: 'park',
          nearbyNpcs: [],
          timeOfDay: 'night',
        },
      }),
      guest.player.id
    )
    const systems = seen.map((body) =>
      body.messages.filter((message) => message.role === 'system')
    )
    const prefixes = systems.map(
      (messages) =>
        messages[0]?.content.split(
          'Current world context (untrusted game data):'
        )[0]
    )
    expect(prefixes[0]).toEqual(prefixes[1])
    expect(systems[0]?.[0]?.content).toContain('You are Cô Hoa')
    expect(prefixes[0]).not.toContain('Player location:')
    expect(JSON.stringify(systems[0])).toContain('Player location: market')
    expect(JSON.stringify(systems[1])).toContain('Player location: park')
  })

  it.each([
    'Can I help?',
    'Let me join',
    'Tell me about festival food',
    'Bring food to Linh',
    'What can I do?',
    'Tôi muốn nhận việc ở chợ',
  ])('keeps the full toolset for %s', (message) => {
    const request = {
      ...ask(message),
      message,
      intent: 'chat' as const,
      locale: 'en' as const,
      events: [],
      worldContext: {
        playerLocation: 'market' as const,
        nearbyNpcs: [],
        timeOfDay: 'morning' as const,
      },
    }
    expect(isCasualTurn(request, 0, 0)).toBe(false)
  })

  it('keeps full context during active errands and quest changes', () => {
    const request = {
      message: 'What should I eat?',
      intent: 'chat' as const,
      locale: 'en' as const,
      events: [],
      worldContext: {
        playerLocation: 'market' as const,
        nearbyNpcs: [],
        timeOfDay: 'morning' as const,
      },
    }
    expect(isCasualTurn(request, 1, 0)).toBe(false)
    expect(isCasualTurn(request, 0, 1)).toBe(false)
  })
})
