import { mkdir, writeFile } from 'node:fs/promises'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { PGlite } from '@electric-sql/pglite'
import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { ModelQuestSpecSchema, validateSpec } from '@saigon/shared'
import { z } from 'zod'
import { meteredFetch } from '../src/features/npc/meter'
import { readConfig } from '../src/shared/config'
import { GameDb } from '../src/shared/db'

// Run from the repository root: bun --env-file=apps/server/.env apps/server/scripts/quest-model-spike.ts
const config = readConfig()
if (!config.apiKey) throw new Error('live_model_key_required')
const sql = new PGlite()
await sql.exec(`
  CREATE TABLE model_spend(
    day text PRIMARY KEY, calls integer DEFAULT 0, barks integer DEFAULT 0,
    reserved_usd numeric DEFAULT 0, input_tokens integer DEFAULT 0,
    output_tokens integer DEFAULT 0
  )
`)
const usage = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  estimatedUsd: 0,
}
const toolSchema = ModelQuestSpecSchema
const calls: { input: z.infer<typeof toolSchema>; result: object }[] = []
const tool = createTool({
  id: 'propose-quest',
  description:
    'Propose a quest. The deterministic server validates it; rejected proposals include a reason to correct.',
  inputSchema: toolSchema,
  outputSchema: z.object({
    accepted: z.boolean(),
    reason: z.string(),
    questId: z.string().optional(),
  }),
  execute: async (input) => {
    const validation = validateSpec(input, { quests: [] })
    const result = validation.ok
      ? { accepted: true, reason: 'recorded', questId: 'q_spike' }
      : { accepted: false, reason: validation.reason }
    calls.push({ input, result })
    return result
  },
})
const model = createOpenAICompatible({
  name: 'meta',
  baseURL: (config.apiUrl ?? '').replace(/\/chat\/completions\/?$/, ''),
  apiKey: config.apiKey,
  fetch: meteredFetch(new GameDb(sql), fetch, 0.15, usage),
}).chatModel(config.model ?? '')
const agent = new Agent({
  id: 'quest-spike',
  name: 'Quest schema acceptance spike',
  model,
  instructions: [
    'You are Cô Hoa, market food vendor, giverNpcId hoa.',
    'This is an integration test of your propose-quest tool.',
    'Make exactly one tool call on your first turn: propose a solo quest with one DELIVER step, itemId herbs, npcId hoa.',
    'This intentionally invalid self-delivery must be submitted to exercise validation.',
    'If the tool rejects it, correct the recipient to linh and call propose-quest again immediately.',
    'After acceptance, reply in one short sentence.',
    'Never propose rewards or ids.',
  ].join('\n'),
  tools: { proposeQuest: tool },
})
try {
  const result = await agent.generate(
    'Run the self-delivery rejection and correction test now.',
    {
      maxSteps: 3,
      abortSignal: AbortSignal.timeout(90000),
      modelSettings: { maxOutputTokens: 800, maxRetries: 0 },
      providerOptions: { meta: { reasoningEffort: 'minimal' } },
    }
  )
  const evidence = {
    model: config.model,
    schema: 'discriminatedUnion',
    usage,
    calls,
    steps: result.steps.length,
    reply: result.steps.at(-1)?.text ?? result.text,
    selfCorrected:
      calls.length === 2 &&
      calls[0]?.result &&
      !('questId' in calls[0].result) &&
      calls[1]?.result &&
      'questId' in calls[1].result,
  }
  // Second run: a payoff + twist + riddle proposal must be accepted within 3 steps.
  const authoredCalls: { input: z.infer<typeof toolSchema>; result: object }[] =
    []
  const authoredTool = createTool({
    id: 'propose-quest',
    description:
      'Propose a quest with optional payoff, twist, and riddle. The server validates it; rejected proposals include a reason to correct.',
    inputSchema: toolSchema,
    outputSchema: z.object({
      accepted: z.boolean(),
      reason: z.string(),
      questId: z.string().optional(),
    }),
    execute: async (input) => {
      const validation = validateSpec(input, { quests: [] })
      const result = validation.ok
        ? { accepted: true, reason: 'recorded', questId: 'q_spike' }
        : { accepted: false, reason: validation.reason }
      authoredCalls.push({ input, result })
      return result
    },
  })
  const authoredAgent = new Agent({
    id: 'quest-spike-authored',
    name: 'Quest authored-fields acceptance spike',
    model,
    instructions: [
      'You are Mai, coffee vendor, giverNpcId mai.',
      'This is an integration test of your propose-quest tool.',
      'Make exactly one tool call: a solo quest with two steps:',
      'step 1 TALK_TO npcId hoa, step 2 DELIVER itemId coffee npcId hoa.',
      'Add payoff: a one-line punchline. Add twist { step: DELIVER coffee to son, line: a funny reason }.',
      'Add riddle { text: a one-line clue for the first step }.',
      'If rejected, correct the fields named in the reason and call again. Never propose rewards or ids.',
    ].join('\n'),
    tools: { proposeQuest: authoredTool },
  })
  const authoredResult = await authoredAgent.generate(
    'Propose the payoff + twist + riddle errand now.',
    {
      maxSteps: 3,
      abortSignal: AbortSignal.timeout(90000),
      modelSettings: { maxOutputTokens: 800, maxRetries: 0 },
      providerOptions: { meta: { reasoningEffort: 'minimal' } },
    }
  )
  const authoredAccepted = authoredCalls.find(
    (call) => 'questId' in call.result
  )
  const authored = {
    steps: authoredResult.steps.length,
    calls: authoredCalls,
    accepted: Boolean(authoredAccepted),
    acceptedWithinThree: Boolean(authoredAccepted) && authoredCalls.length <= 3,
    hasPayoff: Boolean(
      (authoredAccepted?.input as { payoff?: string } | undefined)?.payoff
    ),
    hasTwist: Boolean(
      (authoredAccepted?.input as { twist?: unknown } | undefined)?.twist
    ),
    hasRiddle: Boolean(
      (authoredAccepted?.input as { riddle?: unknown } | undefined)?.riddle
    ),
  }
  const combined = { ...evidence, authored }
  await mkdir('/tmp/saigon-quest-evidence', { recursive: true })
  await writeFile(
    '/tmp/saigon-quest-evidence/model-spike.json',
    JSON.stringify(combined, null, 2)
  )
  process.stdout.write(`${JSON.stringify(combined, null, 2)}\n`)
  if (!evidence.selfCorrected || !authored.acceptedWithinThree)
    process.exitCode = 1
} finally {
  await sql.close()
}
