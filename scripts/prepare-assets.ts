import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import {
  dedup,
  flatten,
  getBounds,
  join,
  prune,
  weld,
} from '@gltf-transform/functions'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'apps/client/public/models')
const selected: Record<string, { directory: string; names: string[] }> = {
  city: {
    directory: 'city-kit-commercial/GLB format',
    names: [
      'building-a',
      'building-c',
      'building-e',
      'building-f',
      'building-g',
      'building-j',
      'building-l',
      'detail-awning',
      'detail-parasol-a',
    ],
  },
  people: {
    directory: 'mini-characters/GLB format',
    names: [
      'character-female-a',
      'character-female-b',
      'character-male-a',
      'character-male-b',
    ],
  },
  cars: {
    directory: 'car-kit/GLB format',
    names: ['van', 'taxi', 'hatchback-sports'],
  },
  trains: { directory: 'train-kit/GLB format', names: ['train-tram-modern'] },
  nature: {
    directory: 'nature-kit/GLTF format',
    names: [
      'tree_palmDetailedTall',
      'tree_palmBend',
      'tree_fat',
      'plant_bush',
      'flower_redA',
      'flower_yellowA',
    ],
  },
  food: {
    directory: 'food-kit/GLB format',
    names: [
      'bowl-broth',
      'bowl-soup',
      'pot',
      'loaf-baguette',
      'cup-coffee',
      'banana',
    ],
  },
  roads: {
    directory: 'city-kit-roads/GLB format',
    names: ['light-curved', 'electricity-pole', 'road-sign-street'],
  },
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const records: {
  path: string
  bytes: number
  meshes: number
  materials: number
  triangles: number
  vertices: number
  bounds: { min: number[]; max: number[] } | null
  animations: string[]
}[] = []
for (const [pack, selection] of Object.entries(selected)) {
  for (const name of selection.names) {
    const source = resolve(root, 'assets', selection.directory, `${name}.glb`)
    const target = resolve(output, pack, `${name}.glb`)
    await mkdir(dirname(target), { recursive: true })
    // NodeIO embeds each pack's external palette so every runtime GLB is portable.
    const document = await io.read(source)
    await document.transform(dedup(), prune())
    await io.write(target, document)
    records.push(await record(target, document))
  }
}
const marketTarget = resolve(output, 'ben-thanh-market.glb')
const market = await io.read(
  resolve(root, 'assets/chobenthanh/model/ben-thanh-market.glb')
)
for (const mesh of market.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives())
    primitive.setAttribute('TEXCOORD_0', null)
}
await market.transform(flatten(), dedup(), join(), weld(), prune())
await io.write(marketTarget, market)
records.push(await record(marketTarget, market))
await writeFile(
  resolve(output, 'manifest.json'),
  `${JSON.stringify(records, null, 2)}\n`
)
process.stdout.write(
  `Prepared ${records.length} embedded runtime models (${(records.reduce((sum, entry) => sum + entry.bytes, 0) / 1048576).toFixed(2)} MiB).\n`
)

async function record(
  path: string,
  document: Awaited<ReturnType<NodeIO['read']>>
) {
  const root = document.getRoot()
  let triangles = 0
  let vertices = 0
  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      vertices += primitive.getAttribute('POSITION')?.getCount() ?? 0
      triangles +=
        (primitive.getIndices()?.getCount() ??
          primitive.getAttribute('POSITION')?.getCount() ??
          0) / 3
    }
  }
  return {
    path: path.slice(output.length + 1),
    bytes: (await stat(path)).size,
    meshes: root.listMeshes().length,
    materials: root.listMaterials().length,
    triangles,
    vertices,
    bounds: root.listScenes()[0] ? getBounds(root.listScenes()[0]) : null,
    animations: root.listAnimations().map((animation) => animation.getName()),
  }
}
