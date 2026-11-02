/**
 * The comic papercraft palette. One module owns every colour token used by
 * the world render (ground, sky, fog, signage, neon). Hex values are the
 * look-guide starting points; tune here and keep the token names so later
 * phases migrate hard-coded hexes into these tokens as they touch files.
 */
export const PALETTE = {
  /** Ground and plinth top. */
  paper: '#e9dcbc',
  /** Diorama base skirt. */
  paperEdge: '#b89f78',
  /** Outlines and bubble borders (not pure black). */
  ink: '#2b2230',
  /** Cathedral accents and roofs. */
  brick: '#c8643f',
  /** Shophouse trim. */
  shutter: '#4f8f6e',
  /** Pastel day sky. */
  skyDayTop: '#9fd0ee',
  skyDayHorizon: '#fde6c8',
  /** Sunset sky. */
  skyEveTop: '#2d385f',
  skyEveHorizon: '#ff9a7a',
  /** Rain sky. */
  skyRainTop: '#6f7f90',
  skyRainHorizon: '#9aa7b3',
  /** Warm interior window glow. */
  window3000k: '#ffb46b',
  /** Night signage. */
  neonCyan: '#19e3ff',
  neonMagenta: '#ff3dcb',
  neonYellow: '#ffe14d',
  /**
   * Road tint in rain: the road asphalt (`#586465`) scaled to 0.7 and
   * shifted toward blue.
   */
  wetRoad: '#2d3747',
} as const

export type PaletteToken = keyof typeof PALETTE
