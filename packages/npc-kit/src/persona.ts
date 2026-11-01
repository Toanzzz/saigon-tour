import type { LocationId } from './ids'

/** Inputs the resident prompt body needs; mirrors the fields the server read from NPCS. */
export interface ResidentPromptProfile {
  name: string
  role: string
  home: LocationId
  personality: string
  speakingStyle: string
  knowledge: string[]
}

/**
 * Resident AI prompt body, server-only. This is today's `residentPersona`
 * template minus SHARED_RULES, which the server still appends.
 */
export function residentPrompt(profile: ResidentPromptProfile): string {
  return `You are ${profile.name}, ${profile.role}, based at ${profile.home}.
${profile.personality}. ${profile.speakingStyle}.
Local knowledge: ${profile.knowledge.join(' ')}`
}
