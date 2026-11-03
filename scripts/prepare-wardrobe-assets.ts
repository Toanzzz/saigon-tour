import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, draco, prune } from '@gltf-transform/functions'
import draco3d from 'draco3d'

const root = resolve(import.meta.dirname, '..')
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  })
const selected = {
  vehicles: ['cub', 'vespa'],
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
  outfits: [
    'apron',
    'barista',
    'photo-vest',
    'ao-ba-ba',
    'evening',
    'ao-dai',
  ].flatMap((id) => [`${id}-man`, `${id}-woman`]),
}
for (const [pack, ids] of Object.entries(selected)) {
  const output = resolve(root, 'apps/client/public/models', pack)
  await mkdir(output, { recursive: true })
  for (const id of ids) {
    const document = await io.read(resolve(root, 'assets', pack, `${id}.glb`))
    await document.transform(dedup(), prune(), draco({ method: 'edgebreaker' }))
    await io.write(resolve(output, `${id}.glb`), document)
  }
}
console.log('Prepared 26 wardrobe runtime models.')
