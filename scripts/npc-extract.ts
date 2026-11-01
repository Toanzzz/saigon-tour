/**
 * One-off generator for the per-NPC packages. Reads today's shared tables and
 * the persona bodies, then writes `packages/npc-<id>/`. Deleted once the
 * neighbors and residents are extracted and hand-reviewed.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  GIVER_UNLOCKS,
  NEIGHBOR_IDS,
  NPC_NAMES,
  NPC_POSITIONS,
  NPCS,
  npcText,
  QUEST_DOMAINS,
  seedsFor,
  UNLOCKS,
} from '../packages/shared/src/index.ts'

const root = resolve(import.meta.dirname, '..')

// World model + portrait background per neighbor, from places.ts and conversation.css.
const LOOK: Record<string, { body: string; color: string; bg: string }> = {
  hoa: { body: 'female-b', color: '#f6c568', bg: 'var(--roof-hi)' },
  tam: { body: 'male-a', color: '#85c7b6', bg: 'var(--pool)' },
  linh: { body: 'female-a', color: '#ed9d86', bg: 'var(--leaf-hi)' },
  ba: { body: 'male-b', color: '#eddca7', bg: 'var(--bus)' },
  mai: { body: 'female-b', color: '#baddc1', bg: 'var(--leaf-hi)' },
  alex: { body: 'male-a', color: '#c6b5e5', bg: 'var(--pool)' },
  vy: { body: 'female-a', color: '#e6a56e', bg: 'var(--bus)' },
  son: { body: 'male-b', color: '#8fc2d1', bg: 'var(--leaf-hi)' },
  thao: { body: 'female-b', color: '#d5a8c9', bg: 'var(--roof-hi)' },
}

// Persona bodies lifted from apps/server/src/features/npc/personas/*, minus ${SHARED_RULES}.
const PERSONA: Record<string, string> = {
  tam: `
You are Anh Tâm, a cheerful xe ôm driver who waits by the Bến Thành bus stop.

Personality: quick, helpful, knows every shortcut, proud of his spotless helmet.
Reacts to the player's reputation: friendlier and more generous with tips once the
player has helped a neighbor.

Knowledge scope: routes and fares. City bus 5 coins, metro 6, xe ôm 8, xích lô 3.
Stops: Bến Thành, Công viên, Tòa Thị Chính, Nhà thờ Đức Bà, Bến Sông. Walking is free.
Recommend a destination that fits what the player wants. You cannot sell rides
yourself; tell the player to use the stop sign.
Use get-context when you need the player's coins or places they have seen.`,
  linh: `
You are Chị Linh, a university student who volunteers in the neighborhood park.

Personality: curious, kind, sociable. The neighborhood's social hub: shares gentle
rumors and introduces the player to other neighbors (Cô Hoa at the market, Anh Tâm
at the bus stop, Ông Ba by the river).

Knowledge scope: the park, the community lunch you are cooking, student life, the
cathedral square and City Hall nearby. You are waiting for Cô Hoa's fresh herbs.`,
  ba: `
You are Ông Ba, an elderly xích lô (cyclo) driver who rests by the Sài Gòn river.

Personality: patient, nostalgic, gently funny. Tells short personal stories about
the old city, the river, and the colonial buildings, then encourages the player to
slow down and look around.

Knowledge scope: history and atmosphere of Bến Thành, Nguyễn Huệ, Tòa Thị Chính,
Nhà thờ Đức Bà, and the river. Xích lô rides cost 3 coins from any stop.`,
  mai: `
You are Mai, the owner of a little sidewalk café beside Bến Thành Market.

Personality: warm, observant, quietly witty. Offer a shaded seat, ask what the
player has enjoyed, and remember their favorite drink or place when they tell you.

Knowledge scope: Vietnamese coffee, bánh mì, market mornings, the food alley,
and the walk along Lê Lợi to Nguyễn Huệ and City Hall. Suggest the Post Office for
a postcard and the riverfront for a slower afternoon.
You propose neighborhood errands through the tools. Purchases use the market controls. Players buy food
using the market's purchase controls. Never claim that a chat has spent coins or
added items. You can remember a player's preferences and read their world context.`,
  alex: `
You are Alex, a visiting photographer admiring the Sài Gòn Opera House.

Personality: curious, upbeat, considerate of residents. Share short observations
about façades, street scenes, and light; invite the player to notice one detail.

Knowledge scope: the Opera House columns, Đồng Khởi shops, the cathedral and
Central Post Office square, the statues at City Hall and the cathedral, and the
riverfront viewpoint looking toward the skyline. Suggest Nguyễn Huệ at evening.
You are a fellow visitor, so do not invent local history or claim expert knowledge.
You propose photography errands through the tools; server code grants rewards. The player
uses the viewpoint's postcard controls for a keepsake. You can remember a player's
favorite scenes and read their world context.`,
  vy: `
You are Vy, a lantern maker who works near Tòa Thị Chính and the Nguyễn Huệ
walking street.

Personality: patient, inventive, quietly proud of the evening streets. You notice
how color and light change the mood of a familiar corner.

Knowledge scope: City Hall, Nguyễn Huệ, evening walks, the food alley, and the
small details that make a public square feel welcoming.
Remember helpful acts with remember-player-fact and use get-context when
you need to understand the player's route.`,
  son: `
You are Sơn, a postcard collector who lingers in the Central Post Office square.

Personality: curious, sentimental, and always looking for a new view. You treat
every postcard as a small bridge between a place and the person who remembers it.

Knowledge scope: the Central Post Office, its square, the cathedral, the river,
and the stories people send home from Sài Gòn.
Remember helpful acts with remember-player-fact and use get-context when
you need to understand the player's route.`,
  thao: `
You are Thảo, a music student practicing near the Sài Gòn Opera House.

Personality: bright, earnest, and attentive to small sounds around the city.
You share secrets with a warm voice and a little shyness.

Knowledge scope: the Opera House, Đồng Khởi, the cathedral square, echoes,
street musicians, and the way a short walk can become a melody.
Remember helpful acts with remember-player-fact and use get-context when
you need to understand the player's route.`,
}

const README: Record<string, string> = {
  tam: 'Neighborhood xe ôm driver by the Bến Thành bus stop. Grants the helmet and sunglasses, the cub, and the bicycle.',
  linh: 'Student volunteer in the park. The social hub who introduces other neighbors; grants the volunteer cap, bicycle, and bunny.',
  ba: 'Cyclo driver and storyteller by the river. Grants the bucket hat, áo bà ba, and the basket bicycle.',
  mai: 'Sidewalk café owner by the market. Grants the scarf, barista outfit, and the cat.',
  alex: 'Visiting photographer at the Opera House. Grants the camera strap, photo vest, and the vespa.',
  vy: 'Lantern maker near City Hall. Grants the lantern backpack, evening outfit, and lantern hat.',
  son: 'Postcard collector in the Post Office square. Grants the satchel, beret, and the parrot.',
  thao: 'Music student at the Opera House. Grants the headphones, áo dài, and the chick.',
}

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const arr = (items: string[]) => `[${items.map(q).join(', ')}]`

function textLiteral(id: string) {
  const en = npcText(id as never, 'en')
  const vi = npcText(id as never, 'vi')
  return `{
    en: {
      role: ${q(en.role)},
      knowledge: ${arr(en.knowledge)},
    },
    vi: {
      role: ${q(vi.role)},
      knowledge: ${arr(vi.knowledge)},
    },
  }`
}

function seedsLiteral(id: string) {
  const en = seedsFor(id as never, 'en')
  const vi = seedsFor(id as never, 'vi')
  return en
    .map((seed, i) => {
      const steps = seed.steps
        .map((s) => `{ ${Object.entries(s).map(([k, v]) => `${k}: ${q(String(v))}`).join(', ')} }`)
        .join(', ')
      return `    {
      scope: ${q(seed.scope)},
      steps: [${steps}],
      text: {
        en: { title: ${q(en[i].title)}, description: ${q(en[i].description)} },
        vi: { title: ${q(vi[i].title)}, description: ${q(vi[i].description)} },
      },
    }`
    })
    .join(',\n')
}

function domainLiteral(id: string) {
  const d = QUEST_DOMAINS[id as never] as {
    home: string
    locations: string[]
    npcs: string[]
    items: string[]
    gifts: string[]
  }
  return `{
    home: ${q(d.home)},
    locations: ${arr(d.locations)},
    npcs: ${arr(d.npcs)},
    items: ${arr(d.items)},
    gifts: ${arr(d.gifts)},
  }`
}

function unlocksLiteral(id: string) {
  const ids = (GIVER_UNLOCKS as Record<string, string[]>)[id] ?? []
  const defs = ids.map((uid) => {
    const u = UNLOCKS[uid]
    const lines = [
      `    id: ${q(u.id)}`,
      `    kind: ${q(u.kind)}`,
      `    slot: ${q(u.slot)}`,
      `    tier: ${q(u.tier)}`,
    ]
    if (u.model) lines.push(`    model: ${q(u.model)}`)
    if (u.scale !== undefined) lines.push(`    scale: ${u.scale}`)
    if (u.speed !== undefined) lines.push(`    speed: ${u.speed}`)
    if (u.palette)
      lines.push(
        `    palette: { ${Object.entries(u.palette).map(([k, v]) => `${q(k)}: ${q(v as string)}`).join(', ')} }`
      )
    return `  {\n${lines.join(',\n')},\n  }`
  })
  return `[\n${defs.join(',\n')},\n]`
}

async function emitNeighbor(id: string) {
  const dir = resolve(root, `packages/npc-${id}`)
  const npc = NPCS[id as never] as { friendliness: number }
  const look = LOOK[id]
  const pos = NPC_POSITIONS[id as never] as [number, number, number]
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
        exports: {
          '.': './src/index.ts',
          './persona': './src/persona.ts',
        },
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

  await writeFile(
    resolve(dir, 'src/profile.ts'),
    `import type { NpcProfile } from '@saigon/npc-kit'

export const profile: NpcProfile = {
  kind: 'neighbor',
  friendliness: ${npc.friendliness},
  names: { en: ${q(NPC_NAMES[id as never].en)}, vi: ${q(NPC_NAMES[id as never].vi)} },
  text: ${textLiteral(id)},
  personality: ${q((NPCS[id as never] as { personality: string }).personality)},
  speakingStyle: ${q((NPCS[id as never] as { speakingStyle: string }).speakingStyle)},
  home: ${q((NPCS[id as never] as { location: string }).location)},
}
`
  )
  await writeFile(
    resolve(dir, 'src/story.ts'),
    `import type { NpcStory } from '@saigon/npc-kit'

export const story: NpcStory = {
  seeds: [
${seedsLiteral(id)},
  ],
  domain: ${domainLiteral(id)},
}
`
  )
  await writeFile(
    resolve(dir, 'src/unlocks.ts'),
    `import type { UnlockSpec } from '@saigon/npc-kit'

export const unlocks: UnlockSpec[] = ${unlocksLiteral(id)}
`
  )
  await writeFile(
    resolve(dir, 'src/look.ts'),
    `import type { NpcLook } from '@saigon/npc-kit'

export const look: NpcLook = {
  body: ${q(look.body)},
  color: ${q(look.color)},
  portraitBg: ${q(look.bg)},
  animation: 'idle',
}
`
  )
  await writeFile(
    resolve(dir, 'src/place.ts'),
    `import type { NpcPlace } from '@saigon/npc-kit'

export const place: NpcPlace = {
  at: [${pos[0]}, ${pos[2]}],
  anchor: [${pos[0]}, ${pos[1]}, ${pos[2]}],
}
`
  )
  await writeFile(
    resolve(dir, 'src/persona.ts'),
    `/** ${NPC_NAMES[id as never].en}'s AI prompt body. Server-only; SHARED_RULES is appended by the server. */
export const persona = \`${PERSONA[id].replace(/`/g, '\\`')}\`
`
  )
  await writeFile(
    resolve(dir, 'src/index.ts'),
    `import { defineNpc } from '@saigon/npc-kit'
import { look } from './look'
import { persona } from './persona'
import { place } from './place'
import { profile } from './profile'
import { story } from './story'
import { unlocks } from './unlocks'

export default defineNpc({
  id: ${q(id)},
  profile,
  story,
  unlocks,
  look,
  place,
  persona,
})
`
  )
  await writeFile(
    resolve(dir, 'README.md'),
    `# npc-${id} — ${NPC_NAMES[id as never].en}

${README[id] ?? ''}

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

const targets = NEIGHBOR_IDS.filter((id) => id !== 'hoa')
for (const id of targets) await emitNeighbor(id)
