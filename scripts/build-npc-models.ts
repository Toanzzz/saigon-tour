/**
 * Build NPC world models by dressing the Kenney base per scripts/npc-dressing.json.
 * Usage: bun scripts/build-npc-models.ts tam linh ...   (ids; default: all in the table)
 * Produces packages/npc-<id>/assets/model/<id>.{glb,blend}. Run prepare:assets after.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NPC_LOOKS } from '../packages/shared/src/index.ts'
import dressing from './npc-dressing.json'

const BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
const root = resolve(import.meta.dirname, '..')
const table = dressing as Record<string, Record<string, unknown>>

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(table)
const failed: string[] = []
for (const id of ids) {
  const look = NPC_LOOKS[id as keyof typeof NPC_LOOKS]
  if (!look) {
    console.log(`skip ${id}: unknown`)
    continue
  }
  const base = look.body === 'own' ? 'female-b' : look.body
  const d = table[id] ?? {}
  const cfg: Record<string, unknown> = {
    id,
    base: `apps/client/public/models/people/character-${base}.glb`,
    out_glb: `packages/npc-${id}/assets/model/${id}.glb`,
    out_blend: `packages/npc-${id}/assets/model/${id}.blend`,
  }
  for (const [k, v] of Object.entries(d)) {
    cfg[k] = typeof v === 'string' && v.endsWith('.glb') ? `assets/${v}` : v
  }
  mkdirSync(resolve(root, `packages/npc-${id}/assets/model`), {
    recursive: true,
  })
  const cfgPath = resolve(root, `/tmp/npc-cfg-${id}.json`)
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
  const r = spawnSync(
    BLENDER,
    ['--background', '--python', 'scripts/build-npc-model.py', '--', cfgPath],
    { cwd: root, encoding: 'utf8' }
  )
  const out = (r.stdout ?? '') + (r.stderr ?? '')
  const wrote = out.match(/WROTE .*?(\d+)/)
  const acts = out.match(/ACTIONS: (\d+)/)
  if (r.status === 0 && wrote)
    console.log(`${id}: ${wrote[1]} bytes, ${acts?.[1] ?? '?'} actions`)
  else {
    failed.push(id)
    console.log(
      `${id}: FAILED\n${out
        .split('\n')
        .filter((l) => /Error|Traceback|assert/.test(l))
        .slice(0, 4)
        .join('\n')}`
    )
  }
}
console.log(
  `\ndone: ${ids.length - failed.length}/${ids.length}` +
    (failed.length ? ` failed: ${failed.join(', ')}` : '')
)
if (failed.length) process.exit(1)
