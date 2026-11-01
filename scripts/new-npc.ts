/**
 * Scaffold a new NPC package: `bun scripts/new-npc.ts <id> [neighbor|resident]`.
 * Creates `packages/npc-<id>/` with the standard slots and asset folders, then
 * reminds you to register it in `packages/shared/src/npcs/registry.ts`.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [, , id, kindArg] = process.argv
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('Usage: bun scripts/new-npc.ts <id> [neighbor|resident]')
  process.exit(1)
}
const kind = kindArg === 'resident' ? 'resident' : 'neighbor'
const root = resolve(import.meta.dirname, '..')
const dir = resolve(root, `packages/npc-${id}`)

await mkdir(resolve(dir, 'src'), { recursive: true })
for (const a of ['model', 'avatar', 'art', 'refs'])
  await mkdir(resolve(dir, 'assets', a), { recursive: true })

await writeFile(
  resolve(dir, 'package.json'),
  `${JSON.stringify(
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
  )}\n`
)
await writeFile(
  resolve(dir, 'tsconfig.json'),
  `${JSON.stringify(
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
  )}\n`
)
await writeFile(
  resolve(dir, 'src/persona.ts'),
  `/** ${id}'s AI prompt body. Server-only; SHARED_RULES is appended by the server. */\nexport const persona = ''\n`
)

if (kind === 'neighbor') {
  await writeFile(
    resolve(dir, 'src/index.ts'),
    `import { defineNpc, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'female-a',
  color: '#baddc1',
  animation: 'idle',
}

export default defineNpc({
  id: '${id}',
  profile: {
    kind: 'neighbor',
    friendliness: 1,
    names: { en: 'TODO', vi: 'TODO' },
    text: {
      en: { role: 'TODO', knowledge: [] },
      vi: { role: 'TODO', knowledge: [] },
    },
    personality: 'TODO',
    speakingStyle: 'TODO',
    home: 'market',
  },
  story: {
    seeds: [],
    domain: {
      home: 'market',
      locations: ['market'],
      npcs: [],
      items: [],
      gifts: [],
    },
  },
  unlocks: [],
  look,
  place: { at: [0, 0], anchor: [0, 0, 0] },
})
`
  )
} else {
  await writeFile(
    resolve(dir, 'src/index.ts'),
    `import { defineResident, type NpcLook } from '@saigon/npc-kit'

const look: NpcLook = {
  body: 'female-a',
  color: '#baddc1',
  portraitBg: 'var(--avatar-color)',
  animation: 'idle',
  avatar: false,
}

export default defineResident({
  id: '${id}',
  name: { en: 'TODO', vi: 'TODO' },
  roles: { en: 'TODO', vi: 'TODO' },
  place: { en: 'the market', vi: 'chợ' },
  home: 'market',
  at: [0, 0],
  look,
})
`
  )
}

await writeFile(
  resolve(dir, 'README.md'),
  `# npc-${id}\n\nTODO: backstory, arc, relationships, voice notes, art to-do.\n`
)
await writeFile(
  resolve(dir, 'assets/CREDITS.md'),
  `# Credits — npc-${id}\n\nList each asset's author and license here.\n`
)
for (const a of ['model', 'avatar', 'art', 'refs'])
  await writeFile(
    resolve(dir, `assets/${a}/.gitkeep`),
    `# Drop ${a} source files here. See CREDITS.md.\n`
  )

console.log(`Created packages/npc-${id}.`)
console.log('Next: add it to NEIGHBOR_IDS/RESIDENT_IDS in @saigon/npc-kit,')
console.log('register it in packages/shared/src/npcs/registry.ts, wire')
console.log('tsconfig references, then run bun install.')
