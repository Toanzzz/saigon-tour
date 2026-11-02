import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// 5a is CSS-only. Classic must look exactly like before, so every comic bubble
// restyle has to be gated behind the `[data-look="comic"]` root attribute.
const people = readFileSync(
  fileURLToPath(new URL('../src/shared/ui/people.css', import.meta.url)),
  'utf8'
)
const world = readFileSync(
  fileURLToPath(new URL('../src/shared/ui/world.css', import.meta.url)),
  'utf8'
)

/** Pull every CSS rule header (the selector list before each `{`). */
function selectors(css: string): string[] {
  return [...css.matchAll(/([^{}]+)\{/g)]
    .map((m) => m[1].trim())
    .filter((s) => s && !s.startsWith('@') && !s.startsWith('/*'))
}

describe('classic keeps the original bubble style (map Phase 5a)', () => {
  it('every rule touching .presence-bubble appearance is comic-gated', () => {
    // The one un-gated .presence-bubble rule is the original base style.
    const base = selectors(people).filter(
      (s) => s.includes('.presence-bubble') && !s.includes('[data-look=')
    )
    // Allowed un-gated selectors: the original base rule only (no tail/wire).
    for (const sel of base) {
      expect(sel).not.toContain('::before')
      expect(sel).not.toContain('::after')
      expect(sel).not.toContain('.still')
    }
  })

  it('the comic bubble tail, wire and pop-in are all attribute-gated', () => {
    const comic = selectors(people).filter(
      (s) =>
        s.includes('::before') || s.includes('::after') || s.includes('.still')
    )
    for (const sel of comic)
      if (sel.includes('.presence-bubble'))
        expect(sel).toContain('[data-look="comic"]')
  })

  it('the comic name-tag restyle is attribute-gated, base tag is not', () => {
    const nameTag = selectors(world).filter((s) => s.includes('.name-tag'))
    const comicNameTag = nameTag.filter((s) =>
      s.includes('[data-look="comic"]')
    )
    expect(comicNameTag.length).toBeGreaterThan(0)
    // The plain `.name-tag` base rule survives, un-gated.
    expect(nameTag.some((s) => s.trim() === '.name-tag')).toBe(true)
  })
})
