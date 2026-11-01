import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import {
  dedup,
  draco,
  flatten,
  getBounds,
  join,
  prune,
  textureCompress,
  weld,
} from '@gltf-transform/functions'
import draco3d from 'draco3d'
import sharp from 'sharp'

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
      'detail-awning',
      'detail-parasol-a',
      'building-skyscraper-a',
      'building-skyscraper-b',
      'building-skyscraper-d',
      'building-skyscraper-e',
      'low-detail-building-a',
      'low-detail-building-wide-a',
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
    names: ['van'],
  },
  trains: { directory: 'train-kit/GLB format', names: ['train-tram-modern'] },
  boats: {
    directory: 'watercraft-pack/GLB format',
    names: ['boat-fishing-small', 'boat-row-small'],
  },
  nature: {
    directory: 'nature-kit/GLTF format',
    names: [
      'tree_palmDetailedTall',
      'tree_fat',
      'plant_bush',
      'flower_redA',
      'flower_yellowA',
    ],
  },
  food: {
    directory: 'food-kit/GLB format',
    names: ['bowl-broth', 'pot', 'loaf-baguette', 'cup-coffee', 'banana'],
  },
  roads: {
    directory: 'city-kit-roads/GLB format',
    names: ['light-curved', 'electricity-pole'],
  },
}
// Runtime copies use Draco: about 32% smaller than meshopt after gzip.
// The client decodes them with three's decoder, copied to public/draco.
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  })
/** Read a source and drop Draco so runtime copies load without a decoder. */
async function readSource(path: string) {
  const document = await io.read(resolve(root, 'assets', path))
  for (const extension of document.getRoot().listExtensionsUsed())
    if (extension.extensionName === 'KHR_draco_mesh_compression')
      extension.dispose()
  return document
}
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
/** Draco-compress a runtime copy, then write and record it. */
async function writeRuntime(
  target: string,
  document: Awaited<ReturnType<NodeIO['read']>>
) {
  await document.transform(
    draco({ method: 'edgebreaker', encodeSpeed: 5, decodeSpeed: 5 })
  )
  await io.write(target, document)
  records.push(await record(target, document))
}
for (const [pack, selection] of Object.entries(selected)) {
  for (const name of selection.names) {
    const source = resolve(root, 'assets', selection.directory, `${name}.glb`)
    const target = resolve(output, pack, `${name}.glb`)
    await mkdir(dirname(target), { recursive: true })
    // NodeIO embeds each pack's external palette so every runtime GLB is portable.
    const document = await io.read(source)
    await document.transform(dedup(), prune())
    await writeRuntime(target, document)
  }
}
// Pets are the CC0 cube-pets pack, renamed to the unlock catalog ids.
const pets: Record<string, string> = {
  dog: 'animal-dog',
  bunny: 'animal-bunny',
  cat: 'animal-cat',
  parrot: 'animal-parrot',
  chick: 'animal-chick',
}
for (const [id, name] of Object.entries(pets)) {
  const source = resolve(root, 'assets/cube-pets/GLB format', `${name}.glb`)
  const target = resolve(output, 'pets', `${id}.glb`)
  await mkdir(dirname(target), { recursive: true })
  const document = await io.read(source)
  await document.transform(dedup(), prune())
  await writeRuntime(target, document)
}
// Cosmetics, vehicles, and collectibles are project-authored, built by the
// Blender scripts.
const authored: Record<string, string[]> = {
  collectibles: ['coin'],
  cosmetics: [
    'non-la',
    'helmet',
    'volunteer-cap',
    'bucket-hat',
    'lantern-hat',
    'beret',
    'sunglasses',
    'scarf',
    'camera-strap',
    'lantern-backpack',
    'satchel',
    'headphones',
  ],
  vehicles: ['cub', 'vespa'],
}
for (const [pack, names] of Object.entries(authored)) {
  for (const name of names) {
    const source = resolve(root, 'assets', pack, `${name}.glb`)
    const target = resolve(output, pack, `${name}.glb`)
    await mkdir(dirname(target), { recursive: true })
    const document = await io.read(source)
    await document.transform(dedup(), prune())
    await writeRuntime(target, document)
  }
}
const marketTarget = resolve(output, 'landmarks/cho-ben-thanh.glb')
await mkdir(dirname(marketTarget), { recursive: true })
const market = await readSource('landmarks/chobenthanh-model.glb')
for (const mesh of market.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives())
    primitive.setAttribute('TEXCOORD_0', null)
}
await market.transform(flatten(), dedup(), join(), weld(), prune())
await writeRuntime(marketTarget, market)
// Landmark sources are already decimated; runtime copies only cap textures.
const landmarks = {
  'nha-tho-duc-ba': 'landmarks/nhathoducba-model.glb',
  'toa-thi-chinh': 'landmarks/toathichinh-model.glb',
  'nha-tho-duc-ba-statue': 'landmarks/nhathoducba-statue-model.glb',
  'toa-thi-chinh-statue': 'landmarks/toathichinh-statue-model.glb',
}
for (const [name, source] of Object.entries(landmarks)) {
  const target = resolve(output, `landmarks/${name}.glb`)
  await mkdir(dirname(target), { recursive: true })
  const document = await readSource(source)
  // Toy-diorama lighting reads better from albedo alone; drop PBR maps.
  for (const material of document.getRoot().listMaterials()) {
    material.setNormalTexture(null)
    material.setMetallicRoughnessTexture(null)
    material.setMetallicFactor(0)
    material.setRoughnessFactor(0.85)
  }
  for (const extension of document.getRoot().listExtensionsUsed())
    if (extension.extensionName === 'KHR_materials_volume') extension.dispose()
  await document.transform(
    weld(),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [1024, 1024],
    }),
    dedup(),
    prune()
  )
  await writeRuntime(target, document)
}
// Plain player bodies picked on the title screen; the earned cosmetics layer
// on top. The retired player-tourist source stays in assets/ but ships nothing.
for (const body of ['man', 'woman']) {
  const bodyTarget = resolve(output, `people/player-${body}.glb`)
  const bodyDoc = await io.read(
    resolve(root, `assets/player-bases/player-${body}.glb`)
  )
  await bodyDoc.transform(dedup(), prune())
  await writeRuntime(bodyTarget, bodyDoc)
}
const decoderSource = resolve(
  dirname(
    createRequire(resolve(root, 'apps/client/package.json')).resolve(
      'three/package.json'
    )
  ),
  'examples/jsm/libs/draco/gltf'
)
const decoderTarget = resolve(root, 'apps/client/public/draco')
await mkdir(decoderTarget, { recursive: true })
for (const file of ['draco_decoder.wasm', 'draco_wasm_wrapper.js'])
  await copyFile(resolve(decoderSource, file), resolve(decoderTarget, file))
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
