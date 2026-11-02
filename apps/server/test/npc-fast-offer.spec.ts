import { describe, expect, it } from 'vitest'
import { ask, hoaDelivery, live, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()

describe('immediate model-authored errand replies', () => {
  it.each(['en', 'vi'] as const)(
    'preserves a hidden riddle and uses the %s authored description',
    async (locale) => {
      const description =
        locale === 'vi' ? 'Giải câu đố của cô nha.' : 'Solve my riddle.'
      const harness = ctx.fx.harness(
        live,
        scripted([
          {
            tool: [
              'proposeQuest',
              {
                ...hoaDelivery(),
                description,
                steps: [{ type: 'TALK_TO', npcId: 'linh' }],
                riddle: { text: 'Who gives committee titles by the trees?' },
              },
            ],
          },
          'hang',
        ])
      )
      const result = await harness.interact(
        'hoa',
        ask('Any errands?', { locale }),
        ctx.playerId
      )
      expect(result.source).toBe('live')
      expect(result.degraded).toBe(false)
      expect(result.reply).toBe(description)
      expect(result.reply).not.toMatch(/linh|park/i)
      expect(harness.usage.calls).toBe(1)
      expect(result.questEvents[0]?.type).toBe('offered')
    }
  )

  it('still caps repeated rejected proposals at three model steps', async () => {
    const harness = ctx.fx.harness(
      live,
      scripted([
        {
          tool: [
            'proposeQuest',
            {
              ...hoaDelivery(),
              steps: [{ type: 'DELIVER', itemId: 'broth', npcId: 'hoa' }],
            },
          ],
        },
      ])
    )
    const result = await harness.interact(
      'hoa',
      ask('Can I help?'),
      ctx.playerId
    )
    expect(harness.usage.calls).toBe(3)
    expect(
      result.toolCalls.filter((call) => call === 'propose-quest')
    ).toHaveLength(3)
    expect(result.questEvents).not.toContainEqual(
      expect.objectContaining({ type: 'offered' })
    )
  })
})
