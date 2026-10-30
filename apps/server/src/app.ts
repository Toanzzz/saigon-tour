import {
  ChatRequestSchema,
  QuestRequestSchema,
  VerifyRequestSchema,
} from '@saigon/shared'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { validator } from 'hono/validator'
import { NpcAgent } from './agent'
import { isLiveConfigured, readConfig, type ServerConfig } from './config'
import { log } from './logger'
import type { Fetcher } from './meta'

export function createApp(
  config: ServerConfig = readConfig(),
  fetcher: Fetcher = fetch
) {
  const agent = new NpcAgent(config, fetcher)
  const app = new Hono()
    .use(
      '*',
      cors({
        origin: (origin) =>
          config.origins.includes(origin) ? origin : undefined,
        credentials: true,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
        maxAge: 86400,
      })
    )
    .use(
      '*',
      bodyLimit({
        maxSize: 16 * 1024,
        onError: (c) => c.json({ error: 'request_too_large' }, 413),
      })
    )
    .get('/health', (c) =>
      c.json({
        ok: true,
        mode: isLiveConfigured(config)
          ? ('live' as const)
          : ('fallback' as const),
        model: isLiveConfigured(config) ? config.model : null,
      })
    )
    .post(
      '/npc/chat',
      validator('json', (value, c) => {
        const result = ChatRequestSchema.safeParse(value)
        if (!result.success) return c.json({ error: 'invalid_request' }, 400)
        return result.data
      }),
      async (c) => c.json(await agent.chat(c.req.valid('json')))
    )
    .post(
      '/npc/quest',
      validator('json', (value, c) => {
        const result = QuestRequestSchema.safeParse(value)
        if (!result.success) return c.json({ error: 'invalid_request' }, 400)
        return result.data
      }),
      async (c) => c.json(await agent.quest(c.req.valid('json')))
    )
    .post(
      '/npc/verify',
      validator('json', (value, c) => {
        const result = VerifyRequestSchema.safeParse(value)
        if (!result.success) return c.json({ error: 'invalid_request' }, 400)
        return result.data
      }),
      (c) => c.json(agent.verify(c.req.valid('json')))
    )
  app.onError((_error, c) => {
    log(
      'request_failed',
      'Request failed without exposing internal details',
      'warn'
    )
    return c.json({ error: 'request_failed' }, 500)
  })
  return app
}

export type AppType = ReturnType<typeof createApp>
