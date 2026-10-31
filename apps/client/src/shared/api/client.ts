import type { AppType } from '@saigon/server'
import { hc } from 'hono/client'
import { API_BASE, authorizationHeaders } from './transport'

/** Typed Hono RPC client; forwards the stored guest token on every call. */
export const rpc = hc<AppType>(API_BASE, {
  headers: authorizationHeaders,
})
