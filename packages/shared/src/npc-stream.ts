import { z } from 'zod'
import { InteractResponseSchema } from './contracts'

/** NDJSON messages for an interaction; only result carries authoritative state. */
export const NpcStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().max(700) }).strict(),
  z
    .object({ type: z.literal('result'), response: InteractResponseSchema })
    .strict(),
  z.object({ type: z.literal('error') }).strict(),
])
export type NpcStreamEvent = z.infer<typeof NpcStreamEventSchema>
