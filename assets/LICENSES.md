# Asset provenance

Runtime models are an optimized subset of the source packs. `scripts/prepare-assets.ts`
embeds palette textures, merges the market by material, and Draco-compresses runtime
copies. Editable sources remain in their source folders.

Confirmed notices for fonts, Glyphs, three.js, and the Draco decoder ship in
[`apps/client/public/THIRD_PARTY_NOTICES.txt`](../apps/client/public/THIRD_PARTY_NOTICES.txt).
Pending rows identify missing provenance; inclusion here does not assign a license
or establish rights to an unverified source.

| Runtime collection | Source | Author | License evidence |
| --- | --- | --- | --- |
| Market landmark | `landmarks/chobenthanh-model.glb` | Supplied reference-based artwork | Source and `landmarks/chobenthanh*.png` retained; reference rights and production record pending |
| City buildings and parasols | `city-kit-commercial` | Kenney | `city-kit-commercial/License.txt`, CC0 |
| Modular building pack, source inventory | `modular-buildings` | Kenney | `modular-buildings/License.txt`, CC0; not selected by the runtime preparation script |
| Industrial building pack, source inventory | `city-kit-industrial` | Kenney | `city-kit-industrial/License.txt`, CC0; not selected by the runtime preparation script |
| Character models and animations | `mini-characters` | Kenney | `mini-characters/License.txt`, CC0 |
| Tòa Thị Chính, Nhà thờ Đức Bà | `landmarks/toathichinh-model.glb`, `landmarks/nhathoducba-model.glb` | Supplied reference-based artwork | Source and reference renders retained; reference rights, model/tool, and production record pending |
| City Hall statue | `landmarks/toathichinh-statue-model.glb` | Supplied artwork | Source retained; author/license and production record pending |
| Cathedral square statue | `landmarks/nhathoducba-statue-model.glb` | Supplied artwork | Source and reference render retained; author/license and production record pending |
| Player bodies (man, woman) | `player-bases/player-man.blend`, `player-bases/player-woman.blend` | Kenney `character-male-e` and `character-female-e` with the shirt/trouser faces split into recolourable materials | Built by `scripts/blender/build-player-bases.py`; CC0 base |
| Tourist player, retained source | `player-tourist/player-tourist.blend`, `player-tourist/player-tourist.glb` | Kenney `character-male-e` and sunglasses with project hat, backpack, and camera | `scripts/blender/build-tourist.py`; CC0 base; not selected for runtime player bodies |
| Road furnishings | `city-kit-roads` | Kenney | `city-kit-roads/License.txt`, CC0 |
| Cars and shuttle base | `car-kit` | Kenney | `car-kit/License.txt`, CC0 |
| Tram | `train-kit` | Kenney, Guus Vermeulen, Tony Schaer | `train-kit/License.txt`, CC0 |
| River boats | `watercraft-pack` | Kenney | `watercraft-pack/License.txt`, CC0 |
| Palms, trees, planting | `nature-kit` | Kenney | `nature-kit/License.txt`, CC0 |
| Food and stall props | `food-kit` | Kenney | `food-kit/License.txt`, CC0 |
| Pet followers (dog, bunny, cat, parrot, chick) | `cube-pets` | Kenney | `cube-pets/License.txt`, CC0 |
| Cosmetic unlocks (hats, accessories) | `cosmetics` | Project artwork | Built by `scripts/blender/build-cosmetics.py`; original low-poly meshes |
| Vehicle unlocks (Cub, Vespa) | `vehicles` | Project artwork | Built by `scripts/blender/build-vehicles.py`; original low-poly meshes |
| Reward outfits | `outfits` | Kenney base rig with project garments | `outfits/CREDITS.md`; `scripts/blender/build-outfits.py`; CC0 base |
| Collectible red star coin | `collectibles/coin.glb` | Project artwork | Procedural mesh in `scripts/blender/build-collectibles.py` |
| Per-NPC package assets | `packages/npc-<id>/assets` | See each package | `packages/npc-<id>/assets/CREDITS.md` |

Kenney packs permit personal, educational, and commercial use under Creative Commons Zero.
The full license text is retained beside each source pack. The UI sprite sheets are excluded
from the runtime subset because their supplied folder does not contain license evidence.

Transport adaptations, street signs, stall assembly, paving, and district composition
are authored in the game's world modules. Original source code uses the root
Apache-2.0 license. Asset licensing follows this inventory; the source-code license
does not replace third-party notices or resolve pending artwork provenance.

## Fonts, icons, and decoder

| Runtime asset | Source and author | License evidence |
| --- | --- | --- |
| Baloo 2 variable font | `@fontsource-variable/baloo-2` 5.3.0; The Baloo 2 Project Authors, copyright 2019 | Installed package `LICENSE`, SIL OFL 1.1; exact notice retained in `THIRD_PARTY_NOTICES.txt` |
| Be Vietnam Pro, weights 400/600/700 | `@fontsource/be-vietnam-pro` 5.3.0; The Be Vietnam Pro Project Authors, copyright 2021 | Installed package `LICENSE`, SIL OFL 1.1; exact notice retained in `THIRD_PARTY_NOTICES.txt` |
| Male/female Glyphs | `@iconify-json/glyphs` 1.2.0; Goran Spasojevic | Package `info.json` identifies MIT and the upstream `gorango/glyphs` license; exact upstream notice retained |
| Draco WASM decoder and wrapper | `three/examples/jsm/libs/draco/gltf`; Google Draco | Installed decoder `README.md` identifies Apache-2.0; upstream license retained |
| three.js distribution | `three` 0.187.0; three.js authors | Installed package `LICENSE`, MIT; exact notice retained |
| Wardrobe thumbnails | `apps/client/public/images/wardrobe/{man,woman}/*.webp` | Rendered by `scripts/render-wardrobe-thumbnails.ts` from the model sources above; underlying asset licenses apply |

Fonts are bundled from the declared dependencies by Vite. Glyphs are extracted by
`apps/client/scripts/glyphs-extract.ts`; other line icons are project SVG paths.
This inventory covers the identified assets; dependency packages retain their own notices.

## Portrait and gratitude illustrations

Each listed NPC has source `packages/npc-<id>/assets/avatar/portrait.jpg` and a gratitude
illustration in that same folder. Runtime derivatives are
`apps/client/public/npcs/<id>/avatar-{sm,lg}.webp` and `gratitude.webp`.

| NPC ids | Production scripts | Verified production model |
| --- | --- | --- |
| `hoa`, `tam`, `linh`, `ba`, `mai`, `alex`, `vy`, `son`, `thao` | `scripts/generate-npc-portraits.ts`, `scripts/generate-npc-gratitude.ts` → `scripts/generate-image.ts` | Pending per-file generation records |
| `bread-vendor`, `fruit-vendor`, `market-browse`, `market-walk`, `market-family` | Same scripts | Pending per-file generation records |
| `coffee-friend`, `coffee-reader`, `commuter`, `student`, `park-reader`, `park-stretch` | Same scripts | Pending per-file generation records |
| `plaza-friends`, `plaza-stroll`, `opera-visitor`, `postcard-reader`, `square-tourist` | Same scripts | Pending per-file generation records |
| `riverside-friends`, `river-jogger`, `alley-vendor`, `alley-diner` | Same scripts | Pending per-file generation records |

The scripts accept `IMAGE_MODEL` and an image gateway. Their configured defaults do
not prove the model, provider terms, or reference rights for a checked-in image.
Package `CREDITS.md` files identify portraits as generated concepts; they do not contain
per-file model receipts. Those records remain pending.

## Other images and audio

| Files | Source evidence | Pending provenance |
| --- | --- | --- |
| `apps/client/public/images/ben-thanh.webp`, `ben-thanh-1800.webp` | Market illustration and larger title derivative; generic image tool is `scripts/generate-image.ts` | Original production command/model, derivative linkage, and source rights |
| `apps/client/public/icons/app-icon-1024.png`, `og-image.png`, `og-image-1200x630.png` | Bến Thành icon/share artwork retained in the repository | Original production command/model and source rights |
| `apps/client/public/icons/favicon-{16,32}.png`, `icon-{120,152,167,180,192,512}.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | Icon sizes retained beside the source artwork | Reproducible resizing record and verified source-art provenance |
| `apps/client/public/audio/confirm.mp3`, `bell.mp3`, `reward.mp3`, `city.mp3` | Prompts, playback roles, and processing notes in `docs/audio.md` | Generator/provider, production receipt, license/usage terms |

Resolve the pending production and rights records before representing the asset audit
as complete. The presence of a script or a prompt alone is not provenance proof.
