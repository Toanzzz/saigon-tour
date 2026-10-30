# Game progress

## Intent

Stylized Sài Gòn exploration game from `spec/`. The validated build has a playable desktop/mobile quest loop, browser XR integration, audio, visual polish, and a separate React/Tailwind city hub. Existing assets are reused; no additional image or 3D generation was needed.

## Decisions

- Stack: React Three Fiber, Three.js, Rapier, Bun, Node/Hono, shared Zod contracts.
- Meta endpoint: `https://api.meta.ai/v1/chat/completions`.
- Meta model: `muse-spark-1.3-contributor`.
- Server secret: `META_MUSE_API_KEY`; it is not present in client source or build output.
- Project dates: October 27–November 4, 2026; submission November 4, 9 PM ET.
- Art direction: toy diorama from `assets/chobenthanh/chobenthanh.png`. Periwinkle sky, butter walls, terracotta roofs, mint trees. UI surfaces are toy blocks: ink edge, solid side face, roof-ridge header strip. Tokens live in `packages/shared/tokens.css`, shared by client and hub. Type: Baloo 2 (display) and Be Vietnam Pro (body), self-hosted with Vietnamese subsets.
- Runtime ports: client `58000`, server `58001`, design hub `58003`.
- No deployment or public publishing has been performed.

## Passes

1. Complete: foundation, live/fallback agent backend, authored district, keyboard/touch movement, delivery quest, bus, reward, retry, and first production browser flow. Lint, types, build, and 21 tests passed.
2. Complete: XR entry/exit and controller locomotion, snap turn, world-space panels, XR HUD, mobile joystick QA, stale dialogue protection, soft city tint, foliage material correction, runtime asset pruning, audio lifecycle handling, visual canvas inspection, release checks, and the responsive Sài Gòn city hub in `apps/design`.
3. Complete: diorama design overhaul across the game UI (title, HUD, touch controls, dialogs, minimap and map labels on translucent pills, NPC name tags, quest marker, XR canvas panels, scene sky/fog) and the city hub (diorama hero with map pins, story road, neighbor, ride, pulse, and sound cards).

## Current validation

- Root checks passed: `bun run check`, `bun run check:types`, `bun run build`, and `bun run test`.
- Desktop production quest flow passed with no page or console errors.
- Mobile production flow passed at `390×844`; joystick movement and reset passed.
- Browser XR capability check passed; immersive VR stayed hidden when unsupported.
- Canvas captures passed for desktop active play, quest dialogue, reward, and mobile active play.
- Capture budgets stayed within limits: desktop `181 calls / 307,578 triangles / 75 geometries / 47 textures`; mobile `129 calls / 300,612 triangles / 64 geometries / 40 textures`.
- Audio harness passed unlock, click, pickup, board, arrival, reward, pause/resume, mute, restart, hidden-tab lifecycle, and missing-city fallback behavior.
- Design hub checks passed with desktop and mobile headless Playwright flows, including navigation, map stop selection, sound toggle, and no page or console errors.
- Docker API image build passed.

## Next: city hub integration

Bring the hub (`apps/design`) into the client as a live screen driven by game state. Tokens, fonts, and the diorama language are already shared.

### Target

- `GameState.screen` gains `'hub'`. Opened in play from a header button and the `H` key; shown once after the reward panel closes.
- Title → Start exploring → play stays unchanged, so the demo path and QA selectors hold.
- Scene keeps rendering behind a dimmed backdrop; movement already stops when `screen !== 'playing'` (`core/player.tsx`).
- `Esc`, close, or Continue exploring returns to `'playing'`. Hub never opens during `dialogue` or `ride`.
- XR keeps the world-space panels; the DOM hub is hidden in XR.

### Code layout

- `apps/client/src/ui/hub/`: `index.ts` (public `<HubScreen />`), `view.ts` (pure `hubView(state)`), `hero.tsx`, `cards.tsx`, `city.tsx`, `hub.css` scoped under `.hub-screen`.
- No Tailwind or lucide in the client; add `users`, `stamp`, `mic` to `ui/icons.tsx`.
- Add the 1800w `ben-thanh.webp` beside the 900w copy in `apps/client/public/images/`.
- Move the game header out of `ui/index.tsx` (248 lines) before mounting the hub.

### Data mapping

| Hub element | Source | Change |
| --- | --- | --- |
| Wallet | `world.currency` | none |
| Greeting | time of day from `Date` | drop "Mai" and the temperature |
| Story road | `quest`, `world.deliveredItems`, `completed` | step rules in `view.ts` |
| Story rewards | `quest.reward.currency` + postcard | none |
| Neighbor card | last NPC in `world.talkedTo` | add `lastLine: Partial<Record<NpcId, string>>`, set in `chat()` |
| Neighbor status | `source` (`live` / `fallback`) | drop "Remembers 4 chats" and "Voice ready" |
| Ride card | `stop`, `MODES`, `PLACES` | cheapest affordable ride from the current stop |
| Pulse card | `world.visitedLocations.length / 4` | becomes "Places discovered" |
| Sound card | `muted`, `volume` | reuse `update()` |
| Diorama pins | `PLACES.market` | image only shows the market; other stops become chips with visited state |
| Nav tabs | — | removed; Journal and Map buttons open existing panels |

Story steps: no quest → step 1 current; quest active and `herbs:linh` undelivered → step 2 current; delivered and unverified → step 3 current ("Tell Cô Hoa"); quest in `completed` → all done.

### Phases

1. State and selector: `'hub'` screen, `lastLine`, `openHub()`/`closeHub()`, `H` binding, `hubView()` with vitest coverage of step rules and ride choice.
2. Port UI into `ui/hub/`, wire the header button and post-reward entry. Files ≤300 lines.
3. QA: extend `scripts/qa-game.mjs` to open the hub after delivery, assert coins and step text, open Journal from the hub, close back to play; desktop and 390px. Port overflow and font checks from `scripts/qa-hub.mjs`.
4. Retire `apps/design`, `scripts/qa-hub.mjs`, and port `58003` after the client hub passes QA.
5. Update `docs/game-design.md` and `artifacts/final-evidence.md`.

### Open decisions (defaults first)

- Placement: in-play overlay + after reward / replace title / pause menu.
- `apps/design` after the port: delete / keep as a style sandbox.
- Persistence: session only / `localStorage` save of world, completed quests, and settings.

## Open follow-ups

- Physical Quest 3 verification requires hardware and was not performed.
- Deployment and public hosting verification remain outside this local pass.
- The historical failed mobile capture files remain under `artifacts/pass-2-mobile/failure.*`; the final mobile run passed and is recorded in `artifacts/pass-2-inspector/mobile-active-play.json`.
