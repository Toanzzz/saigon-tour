import { z } from 'zod'

const FIRST = [
  'Emma',
  'Liam',
  'Sofía',
  'Mateo',
  'Hannah',
  'Lukas',
  'Chloé',
  'Hugo',
  'Aiko',
  'Kenji',
  'Ji-woo',
  'Priya',
  'Olivia',
  'Noah',
  'Freya',
  'Marco',
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

/** A realistic visiting-tourist name: first name plus surname. */
export function randomPlayerName(random: () => number = Math.random) {
  return `${pick(FIRST, random)} ${pick(LAST, random)}`
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
