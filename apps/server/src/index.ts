import { serve } from '@hono/node-server'
import { createApp } from './app'
import { isLiveConfigured, readConfig } from './config'
import { log } from './logger'

const config = readConfig()
const server = serve({
  fetch: createApp(config).fetch,
  port: config.port,
  hostname: '0.0.0.0',
})
log(
  'server_started',
  `Listening on port ${config.port}; NPC mode: ${isLiveConfigured(config) ? 'live' : 'fallback'}`
)

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close())
}
