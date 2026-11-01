/**
 * One-off generator for the 20 resident packages, built with defineResident.
 * Reads today's shared tables and the client RESIDENT_VISUALS/RESIDENT_ANCHORS.
 * Deleted once residents are extracted and hand-reviewed.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  NPC_NAMES,
  npcText,
  RESIDENT_ANCHORS,
  RESIDENTS,
} from '../packages/shared/src/index.ts'
import { RESIDENT_VISUALS } from '../apps/client/src/shared/world/residents.ts'

const root = resolve(import.meta.dirname, '..')

// English/Vietnamese role and place words, reversed from RESIDENT_TEXT output.
// role is npcText(id).role; place comes from the first knowledge line.
function parts(id: string) {
  const en = npcText(id as never, 'en')
  const vi = npcText(id as never, 'vi')
  // "I spend my days around <place>." -> <place>
  const enPlace = en.knowledge[0].replace(/^I spend my days around /, '').replace(/\.$/, '')
  const viPlace = vi.knowledge[0].replace(/^Mình hay ở quanh /, '').replace(/\.$/, '')
  return { enRole: en.role, viRole: vi.role, enPlace, viPlace }
}

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

async function emit(id: string) {
  const dir = resolve(root, `packages/npc-${id}`)
  const npc = RESIDENTS[id as keyof typeof RESIDENTS] as {
    friendliness: number
    location: string
  }
  const vis = RESIDENT_VISUALS.find((v) => v.id === id)
  if (!vis) throw new Error(`no visuals for ${id}`)
  const anchor = RESIDENT_ANCHORS[id as keyof typeof RESIDENT_ANCHORS] as {
    at: [number, number]
    walk?: [number, number]
  }
  const p = parts(id)
  await mkdir(resolve(dir, 'src'), { recursive: true })
  for (const a of ['model', 'avatar', 'art', 'refs'])
    await mkdir(resolve(dir, 'assets', a), { recursive: true })

  await writeFile(
    resolve(dir, 'package.json'),
    JSON.stringify(
      {
        name: `@saigon/npc-${id}`,
        version: '0.1.0',
        private: true,
        type: 'module',
        exports: { '.': './src/index.ts', './persona': './src/persona.ts' },
        scripts: { 'check:types': 'tsc -b' },
        dependencies: { '@saigon/npc-kit': 'workspace:*' },
      },
      null,
      2
    ) + '\n'
  )
  await writeFile(
    resolve(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          composite: true,
          noEmit: false,
          declaration: true,
          emitDeclarationOnly: true,
          outDir: 'dist',
          rootDir: 'src',
          lib: ['ES2023'],
        },
        include: ['src'],
        references: [{ path: '../npc-kit' }],
      },
      null,
      2
    ) + '\n'
  )

  const lookFields = [
    `  body: ${q(vis.model)}`,
    `  color: '#baddc1'`,
    `  portraitBg: 'var(--avatar-color)'`,
    `  animation: ${q(vis.animation)}`,
  ]
  if (vis.yaw !== undefined) lookFields.push(`  yaw: ${yawExpr(vis.yaw)}`)
  lookFields.push(`  avatar: false`)

  const inputFields = [
    `  id: ${q(id)}`,
    `  name: { en: ${q(NPC_NAMES[id as never].en)}, vi: ${q(NPC_NAMES[id as never].vi)} }`,
    `  roles: { en: ${q(p.enRole)}, vi: ${q(p.viRole)} }`,
    `  place: { en: ${q(p.enPlace)}, vi: ${q(p.viPlace)} }`,
    `  home: ${q(npc.location)}`,
  ]
  if (npc.friendliness !== 0) inputFields.push(`  friendliness: ${npc.friendliness}`)
  inputFields.push(`  at: [${anchor.at[0]}, ${anchor.at[1]}]`)
  if (anchor.walk) inputFields.push(`  walk: [${anchor.walk[0]}, ${anchor.walk[1]}]`)
  if (vis.phase !== undefined) inputFields.push(`  phase: ${vis.phase}`)
  if (vis.yaw !== undefined) inputFields.push(`  yaw: ${yawExpr(vis.yaw)}`)

  await writeFile(
    resolve(dir, 'src/index.ts'),
    `import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
${lookFields.join(',\n')},
}

export default defineResident({
${inputFields.join(',\n')},
  look,
})
`
  )
  // Residents have no bespoke persona body; the server composes residentPrompt().
  await writeFile(
    resolve(dir, 'src/persona.ts'),
    `/** Residents use the shared residentPrompt template; no bespoke body. */
export const persona = ''
`
  )
  await writeFile(
    resolve(dir, 'README.md'),
    `# npc-${id} — ${NPC_NAMES[id as never].en}

${p.enRole} around ${p.enPlace}. Template resident; splits into separate files once it earns a unique story.

Art to-do: own model and a square portrait.
`
  )
  await writeFile(
    resolve(dir, 'assets/CREDITS.md'),
    `# Credits — npc-${id}

No bespoke assets yet. The world and portrait reuse the shared Kenney mini-characters
until a dedicated model and portrait are authored here.
`
  )
  for (const a of ['model', 'avatar', 'art', 'refs'])
    await writeFile(
      resolve(dir, `assets/${a}/.gitkeep`),
      `# Drop ${a} source files here. See CREDITS.md.\n`
    )
  console.log(`wrote packages/npc-${id}`)
}

function yawExpr(yaw: number): string {
  const r = yaw / Math.PI
  if (Math.abs(r - 1) < 1e-9) return 'Math.PI'
  if (Math.abs(r - 0.5) < 1e-9) return 'Math.PI / 2'
  return String(yaw)
}

for (const id of Object.keys(RESIDENTS)) await emit(id)
