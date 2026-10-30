import { InteractRequestSchema, NpcIdSchema } from '@saigon/shared'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { validator } from 'hono/validator'
import { isLiveConfigured, readConfig, type ServerConfig } from './config'
import { log } from './logger'
import { NpcHarness } from './npc/mastra'

export type Fetcher = typeof fetch

export function createApp(
  config: ServerConfig = readConfig(),
  fetcher: Fetcher = fetch
) {
  const harness = new NpcHarness(config, fetcher)
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
      '/npc/:npcId/interact',
      validator('param', (value, c) => {
        const result = NpcIdSchema.safeParse(value.npcId)
        if (!result.success) return c.json({ error: 'unknown_npc' }, 404)
        return { npcId: result.data }
      }),
      validator('json', (value, c) => {
        const result = InteractRequestSchema.safeParse(value)
        if (!result.success) return c.json({ error: 'invalid_request' }, 400)
        return result.data
      }),
      async (c) =>
        c.json(
          await harness.interact(
            c.req.valid('param').npcId,
            c.req.valid('json')
          )
        )
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
