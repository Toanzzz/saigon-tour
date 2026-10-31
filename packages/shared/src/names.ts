import { z } from 'zod'

const FIRST = [
  'Sóc',
  'Mây',
  'Sen',
  'Gió',
  'Bông',
  'Cá',
  'Mèo',
  'Chim',
  'Lá',
  'Sao',
] as const
const SECOND = [
  'Nắng',
  'Xanh',
  'Hồng',
  'Mát',
  'Vàng',
  'Nhỏ',
  'Vui',
  'Bạc',
  'Biển',
  'Phố',
] as const
export const PLAYER_COLORS = ['#f6c568', '#85c7b6', '#ed9d86', '#b6a2dc']

const pick = <T>(items: readonly T[], random: () => number) =>
  items[Math.floor(random() * items.length)] as T

/** A friendly two-word Vietnamese name with a two-digit suffix. */
export function randomPlayerName(random: () => number = Math.random) {
  const number = Math.floor(random() * 90) + 10
  return `${pick(FIRST, random)} ${pick(SECOND, random)} ${number}`
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
