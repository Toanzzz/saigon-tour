# Asset provenance

Runtime assets are an optimized subset of the source packs in this directory. The preparation
script embeds palette textures, merges the static market by material, and Draco-compresses every
runtime model. The Draco decoder in `apps/client/public/draco` is copied from `three`
(Apache-2.0). Editable source files
remain in their source folders.

| Runtime collection | Source | Author | License evidence |
| --- | --- | --- | --- |
| Market landmark | `landmarks/chobenthanh-model.glb` | Project artwork reconstructed from supplied references | Original project model; reference renders `landmarks/chobenthanh*.png` |
| City buildings and parasols | `city-kit-commercial` | Kenney | `city-kit-commercial/License.txt`, CC0 |
| Character models and animations | `mini-characters` | Kenney | `mini-characters/License.txt`, CC0 |
| Tòa Thị Chính, Nhà thờ Đức Bà | `landmarks/toathichinh-model.glb`, `landmarks/nhathoducba-model.glb` | Project models generated from supplied references | `scripts/prepare-assets.ts` caps textures at 1024 px |
| City Hall statue | `landmarks/toathichinh-statue-model.glb` | Supplied project artwork | Original source retained; runtime copy prepared by `scripts/prepare-assets.ts` |
| Cathedral square statue | `landmarks/nhathoducba-statue-model.glb` | Supplied project artwork | Original source and reference render retained; runtime copy prepared by `scripts/prepare-assets.ts` |
| Player bodies (man, woman) | `player-bases/player-man.blend`, `player-bases/player-woman.blend` | Kenney `character-male-e` and `character-female-e` with the shirt/trouser faces split into recolourable materials | Built by `scripts/blender/build-player-bases.py`; CC0 base |
| Road furnishings | `city-kit-roads` | Kenney | `city-kit-roads/License.txt`, CC0 |
| Cars and shuttle base | `car-kit` | Kenney | `car-kit/License.txt`, CC0 |
| Tram | `train-kit` | Kenney, Guus Vermeulen, Tony Schaer | `train-kit/License.txt`, CC0 |
| River boats | `watercraft-pack` | Kenney | `watercraft-pack/License.txt`, CC0 |
| Palms, trees, planting | `nature-kit` | Kenney | `nature-kit/License.txt`, CC0 |
| Food and stall props | `food-kit` | Kenney | `food-kit/License.txt`, CC0 |
| Pet followers (dog, bunny, cat, parrot, chick) | `cube-pets` | Kenney | `cube-pets/License.txt`, CC0 |
| Cosmetic unlocks (hats, accessories) | `cosmetics` | Project artwork | Built by `scripts/blender/build-cosmetics.py`; original low-poly meshes |
| Vehicle unlocks (Cub, Vespa) | `vehicles` | Project artwork | Built by `scripts/blender/build-vehicles.py`; original low-poly meshes |
| Per-NPC package assets | `packages/npc-<id>/assets` | See each package | `packages/npc-<id>/assets/CREDITS.md` |

Kenney packs permit personal, educational, and commercial use under Creative Commons Zero.
The full license text is retained beside each source pack. The UI sprite sheets are excluded
from the runtime subset because their supplied folder does not contain license evidence.

Transport adaptations, street signs, stall assembly, paving, and district
composition are authored in the game's world modules. No externally generated assets are
required for the current district.
