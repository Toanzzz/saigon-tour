/**
 * Generate 2D comic-style square portraits for NPC packages, one per id.
 * Writes packages/npc-<id>/assets/avatar/portrait.jpg via the image gateway.
 *
 * Usage:
 *   bun scripts/generate-npc-portraits.ts            # all NPCs missing a portrait
 *   bun scripts/generate-npc-portraits.ts hoa tam    # only these ids
 *   FORCE=1 bun scripts/generate-npc-portraits.ts ba # regenerate even if present
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { NPC_LOOKS, NPC_NAMES, NPCS } from '../packages/shared/src/index.ts'

const root = resolve(import.meta.dirname, '..')
const MODEL = process.env.IMAGE_MODEL ?? 'gemini-3.1-flash-image'

/** Gender cue from the base body key. */
function gender(body: string) {
  return body.startsWith('female') ? 'female' : 'male'
}

/** A readable solid background colour from the look's token, for the prompt. */
const TOKEN_COLORS: Record<string, string> = {
  'var(--roof-hi)': 'warm coral-orange (#ff9a72)',
  'var(--leaf-hi)': 'soft mint green (#8fe0b8)',
  'var(--pool)': 'light sky blue (#9dc3e7)',
  'var(--bus)': 'bright golden yellow (#ffd84d)',
  'var(--avatar-color)': 'soft pale green (#baddc1)',
}

function bgPhrase(look: { portraitBg?: string }) {
  return (
    (look.portraitBg && TOKEN_COLORS[look.portraitBg]) ??
    'soft pale green (#baddc1)'
  )
}

function promptFor(id: string): string {
  const look = NPC_LOOKS[id as keyof typeof NPC_LOOKS]
  const npc = NPCS[id as keyof typeof NPCS]
  const name = NPC_NAMES[id as keyof typeof NPC_NAMES]
  const g = gender(look.body)
  const subject = `${name.en} (${name.vi}), a ${g} Vietnamese ${npc.role.toLowerCase()} in District 1 of Saigon`
  return [
    'Square 2D comic-style character portrait, head-and-shoulders bust, centered, facing the viewer, for a friendly stylized mobile game set in District 1 of Saigon, Vietnam.',
    `Subject: ${subject}.`,
    `Personality to convey: ${npc.personality.toLowerCase()}.`,
    'Give them clothing and small props that fit their role and a warm, expressive face.',
    'Art style: clean 2D cartoon comic illustration, bold confident black ink outlines, flat cel-shaded coloring with simple soft shading, expressive cartoon features, vibrant palette, consistent across a cast of characters.',
    `Flat solid ${bgPhrase(look)} background, no gradient, no text, no logos, no border frame.`,
    'High contrast, readable at small sizes, 1:1 square.',
  ].join(' ')
}

const requested = process.argv.slice(2)
const ids = (requested.length > 0 ? requested : Object.keys(NPC_LOOKS)).filter(
  (id) => id in NPC_LOOKS
)

const force = process.env.FORCE === '1'
let done = 0
let skipped = 0
const failed: string[] = []
for (const id of ids) {
  const out = `packages/npc-${id}/assets/avatar/portrait.jpg`
  if (!force && existsSync(resolve(root, out))) {
    skipped++
    console.log(`skip ${id} (portrait exists)`)
    continue
  }
  const result = spawnSync(
    'bun',
    [
      'scripts/generate-image.ts',
      '--model',
      MODEL,
      '--size',
      '1024x1024',
      '--out',
      out,
      '--prompt',
      promptFor(id),
    ],
    { cwd: root, stdio: 'inherit' }
  )
  if (result.status === 0) done++
  else failed.push(id)
}
console.log(
  `\nGenerated ${done}, skipped ${skipped}, failed ${failed.length}` +
    (failed.length ? `: ${failed.join(', ')}` : '')
)
if (failed.length) process.exit(1)
