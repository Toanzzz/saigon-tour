import { z } from 'zod'

/** Languages players can pick; matches the client's Paraglide locales. */
export const LocaleSchema = z.enum(['en', 'vi'])
export type Locale = z.infer<typeof LocaleSchema>
