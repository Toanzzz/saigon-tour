/**
 * World render look, read once at boot. `comic` is the toon papercraft
 * diorama; `classic` restores the original Standard-material look so a
 * side-by-side comparison stays byte-for-byte today's render.
 *
 * Read `?look=classic` exactly once, the same pattern as `debug` in
 * `scene.tsx`. Every renderer (primitives, assets, toon, atmosphere) reads
 * this frozen value and never re-parses the URL.
 *
 * This is unrelated to the player cosmetic `Look` type in `@saigon/shared`.
 */
export type WorldLook = 'comic' | 'classic'

function readLook(): WorldLook {
  if (typeof location === 'undefined') return 'comic'
  return new URLSearchParams(location.search).get('look') === 'classic'
    ? 'classic'
    : 'comic'
}

export const LOOK: WorldLook = readLook()
