import { z } from 'zod'

export const VoiceStatusSchema = z.object({ available: z.boolean() }).strict()
export const TranscribeResponseSchema = z
  .object({ text: z.string().max(500) })
  .strict()
