import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'assets/ui/shop/shop-items-sheet.png')
const output = resolve(root, 'apps/client/public/images/shop')
const ids = [
  'coffee',
  'banana',
  'baguette',
  'pho',
  'lacquer-non-la',
  'silk-scarf',
  'festival-ao-dai',
]
const metadata = await sharp(source).metadata()
if (!metadata.width || !metadata.height) throw new Error('Invalid shop sheet')
await mkdir(output, { recursive: true })
const records = []
for (const [index, id] of ids.entries()) {
  const column = index % 4
  const row = Math.floor(index / 4)
  const left = Math.floor((column * metadata.width) / 4)
  const top = Math.floor((row * metadata.height) / 2)
  const width = Math.floor(((column + 1) * metadata.width) / 4) - left
  const height = Math.floor(((row + 1) * metadata.height) / 2) - top
  const target = resolve(output, `${id}.webp`)
  const result = await sharp(source)
    .extract({ left, top, width, height })
    .resize(448, 448, { fit: 'contain', background: '#fff4cf' })
    .webp({ quality: 88 })
    .toFile(target)
  records.push({
    id,
    crop: { left, top, width, height },
    width: result.width,
    height: result.height,
    bytes: result.size,
  })
}
await writeFile(
  resolve(root, 'assets/ui/shop/manifest.json'),
  `${JSON.stringify(
    {
      source: 'shop-items-sheet.png',
      width: metadata.width,
      height: metadata.height,
      items: records,
    },
    null,
    2
  )}\n`
)
console.log(`Prepared ${records.length} shop illustrations.`)
