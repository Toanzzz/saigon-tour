import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Agent } from '@mastra/core/agent'
import { Mastra } from '@mastra/core/mastra'
import { describe, expect, it } from 'vitest'
import { createApp } from '@/app'
import { createNpcMemory } from '@/features/npc/memory/npc-memory'
import { recordTurn } from '@/features/npc/memory/threads'
import { ask, offline, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()
describe('NPC history', () => {
  it('records greetings and fallback turns, isolates the caller and clears on reset', async () => {
    const app = createApp(offline, fetch, ctx.fx)
    const guest = await ctx.fx.guest()
    const other = await ctx.fx.guest()
    await app.harness.interact(
      'bread-vendor',
      ask('Hello!', { intent: 'greet' }),
      guest.player.id
    )
    await app.harness.interact(
      'bread-vendor',
      ask('Any errands?'),
      guest.player.id
    )
    const history = async (token: string) => {
      const response = await app.request('/npc/bread-vendor/history?limit=30', {
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(response.status).toBe(200)
      return response.json()
    }
    expect((await app.request('/npc/bread-vendor/history')).status).toBe(401)
    const saved = await history(guest.token)
    expect(saved.messages).toHaveLength(4)
    expect(saved.messages.map((line: { text: string }) => line.text)).toContain(
      'Any errands?'
    )
    expect((await history(other.token)).messages).toEqual([])
    const store = await ctx.fx.storage.getStore('memory')
    await store?.initializeObservationalMemory({
      threadId: `bread-vendor:${guest.player.id}`,
      resourceId: guest.player.id,
      scope: 'thread',
      config: {},
    })
    await app.harness.clearMemory(guest.player.id)
    expect((await history(guest.token)).messages).toEqual([])
    expect(
      await (await ctx.fx.storage.getStore('memory'))?.getObservationalMemory(
        `bread-vendor:${guest.player.id}`,
        guest.player.id
      )
    ).toBeNull()
    app.realtime.manager.shutdown()
  })
  it('runs the Observer with an explicit compatible model and recalls observations', async () => {
    const seen: unknown[] = []
    const model = createOpenAICompatible({
      name: 'meta',
      baseURL: 'http://fake.test/v1',
      apiKey: 'test',
      fetch: scripted([{ text: 'I remember your favorite tea.' }], seen),
    }).chatModel('test-model')
    const memory = createNpcMemory(model, 200)
    const agent = new Agent({
      id: 'memory-spike',
      name: 'memory-spike',
      instructions: 'You are a neighbor.',
      model,
      memory,
    })
    new Mastra({ agents: { agent }, storage: ctx.fx.storage, logger: false })
    const threadId = `hoa:${ctx.playerId}`
    await recordTurn(
      ctx.fx.storage,
      'hoa',
      ctx.playerId,
      `My favorite tea is lotus tea. ${'Walking around the city. '.repeat(80)}`,
      'Lotus tea, I will remember.'
    )
    await agent.generate('What tea do I like?', {
      memory: { thread: threadId, resource: ctx.playerId },
      modelSettings: { maxOutputTokens: 100 },
      providerOptions: { meta: { reasoningEffort: 'minimal' } },
    })
    await (await memory.omEngine)?.observe({
      threadId,
      resourceId: ctx.playerId,
    })
    const store = await ctx.fx.storage.getStore('memory')
    const record = await store?.getObservationalMemory(threadId, ctx.playerId)
    expect(record?.activeObservations).toContain('lotus tea')
    await agent.generate('Do you still remember?', {
      memory: { thread: threadId, resource: ctx.playerId },
      modelSettings: { maxOutputTokens: 100 },
    })
    expect(JSON.stringify(seen.at(-1))).toContain('lotus tea')
    expect(
      seen.some((body) => /observations>/i.test(JSON.stringify(body)))
    ).toBe(true)
    expect(JSON.stringify(seen.at(-1))).not.toContain(
      'Walking around the city. Walking around the city.'
    )
    const context = await memory.getContext({
      threadId,
      resourceId: ctx.playerId,
    })
    expect(context.messages.length).toBeLessThanOrEqual(40)
    await store?.clearObservationalMemory(threadId, ctx.playerId)
  }, 20000)
})
