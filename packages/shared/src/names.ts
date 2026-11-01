import { z } from 'zod'
import { AVATAR_BODIES, type AvatarBody } from './unlocks/avatar'

/** Visiting-tourist first names, split so a chosen body gets a matching name. */
const MALE_FIRST = [
  'Liam',
  'Mateo',
  'Lukas',
  'Hugo',
  'Kenji',
  'Noah',
  'Marco',
  'Diego',
  'Arjun',
  'Oskar',
  'Finn',
  'Rafael',
  'Theo',
  'Yusuf',
  'Mikkel',
  'Leo',
] as const
const FEMALE_FIRST = [
  'Emma',
  'Sofía',
  'Hannah',
  'Chloé',
  'Aiko',
  'Ji-woo',
  'Priya',
  'Olivia',
  'Freya',
  'Lucía',
  'Mei',
  'Amara',
  'Nora',
  'Zara',
  'Elin',
  'Isla',
] as const
const LAST = [
  'Clarke',
  'Müller',
  'García',
  'Rossi',
  'Dubois',
  'Tanaka',
  'Kim',
  'Patel',
  'Johansson',
  'Novak',
  'Walsh',
  'Silva',
  'Jensen',
  'Becker',
  'Moreau',
  'Brooks',
] as const
export const PLAYER_COLORS = ['#f6c568', '#85c7b6', '#ed9d86', '#b6a2dc']

const pick = <T>(items: readonly T[], random: () => number) =>
  items[Math.floor(random() * items.length)] as T

const firstNames = (body: AvatarBody) =>
  body === 'woman' ? FEMALE_FIRST : MALE_FIRST

/** A realistic visiting-tourist name: a body-matched first name plus surname. */
export function randomPlayerName(
  body: AvatarBody = 'man',
  random: () => number = Math.random
) {
  return `${pick(firstNames(body), random)} ${pick(LAST, random)}`
}

/** Picks a body at random; pairs with {@link randomPlayerName} for the dice. */
export function randomPlayerBody(
  random: () => number = Math.random
): AvatarBody {
  return pick(AVATAR_BODIES, random)
}

export function randomPlayerColor(random: () => number = Math.random) {
  return pick(PLAYER_COLORS, random)
}

/** Display names: trimmed, 2–24 characters, no markup or control characters. */
export const PlayerNameSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(
    z
      .string()
      .min(2)
      .max(24)
      .regex(/^[^<>\p{Cc}]+$/u)
  )
