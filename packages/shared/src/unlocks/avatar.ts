import { z } from 'zod'

/** Playable body types chosen on the title screen. The body is identity, like the name. */
export const AVATAR_BODIES = ['man', 'woman'] as const
export type AvatarBody = (typeof AVATAR_BODIES)[number]

/** Existing saves and presences default to `man`. */
export const AvatarBodySchema = z.enum(AVATAR_BODIES).default('man')

/** Runtime model path for a body, served from the client public models root. */
export const bodyModel = (body: AvatarBody): string => `people/player-${body}`
