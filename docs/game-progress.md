# Game progress

## Intent

Stylized Sài Gòn exploration game from `docs/requirements.md`, with the compact District 1 expansion defined in `docs/city-expansion-plan.md`. The city uses the existing licensed asset collection, authored modular façades, and the supplied landmark statues. The city hub is an in-game overlay.

## City expansion

- Play promise: meet neighbors, help with the community lunch, and discover a compact, busy Sài Gòn district.
- Core loop: walk or pay for a scenic shortcut, talk to a neighbor, carry out an errand, and collect a persistent reward. Transport spends coins; walking stays free.
- Spatial plan: Bến Thành anchors Lê Lợi; Nguyễn Huệ joins City Hall to the river; Đồng Khởi joins the Opera House to the cathedral/Post Office square. A food alley sits behind the market, with the park providing a quiet contrast.
- Compressed scale: 176 × 160 units. Walking speed is 4 units/second; the longest authored route remains a short trip.
- Landmarks integrated: Bến Thành, City Hall, cathedral, Opera House, Central Post Office, Nguyễn Huệ, riverfront, food alley, park. The cathedral and City Hall plazas use the supplied statue models.
- Transport/discovery: eight map destinations and connected routes; façade collision proxies protect landmark bodies while forecourts remain walkable.
- Steering: the café owner and tourist are named chat NPCs. Ambient crowds supplement the existing quest NPCs.
- Wandering story: Vy (City Hall lantern maker), Sơn (Central Post Office postcard collector), and Thảo (Opera House music student) are named chat NPCs with server-authoritative secret quests to the food alley, riverfront, and cathedral. Their models remain visible while only the active quest NPC receives a world name label.
- City trail: the hub now tracks Market, park, City Hall/Nguyễn Huệ, Opera House, cathedral, Central Post Office, food alley, and riverfront, with active/completed secret quests shown below the trail.
- City density: City Hall banners and planters, an Opera ticket kiosk and posters, Post Office mailboxes and flowers, cathedral beds and signage, and river promenade kiosks/stools fill the remaining authored spaces.
- Bug fixes: the quest marker is absolutely positioned above the NPC name, inactive labels are hidden without removing character models, the live guide header wraps on desktop/mobile, and the cathedral GLB rotates toward the clock-side entrance at Công xã Paris.
- Current validation: root check/types/build/test pass; server secret-quest coverage is 65 passing tests plus one skipped, client coverage is 40 passing tests, and headless Playwright passes at 1440×900 and 390×844 for landmarks, filled plazas, visible wandering NPCs, secret quest offer/completion, hub story coverage, transport, purchases, evening lighting, and the river postcard.
- Pass 2 complete: 20 authored ambient residents cover the market, cafés, park, plazas, Opera House, Post Office, riverside, and food alley. Their mixers pause outside a 32-unit activity radius; diagnostics report authored and active crowd counts. Mai (sidewalk café owner) and Alex (visiting photographer) are named server-backed NPCs with memory/context tools, no quest or purchase authority. Food carts, café tables/stools, parked motorbikes, delivery boxes, plants, flags, overhead cables, exercise equipment, river boats, a landing, and a distant Landmark 81-like skyline silhouette are integrated.
- Pass 3 complete: day/evening lighting can be toggled from pause settings, with dusk sky/fog, lower sun, warm market/alley lamps, cool river lamps, and glowing sign bars. Metro now uses an express orthogonal route through the cultural core and falls back to the road graph for park/river/alley branches. The market prompt opens server-authoritative coffee and banana purchases with persistent inventory events. The river prompt opens a fixed postcard viewpoint toward the skyline and waterfront boats.
- Pass 4 complete: fixed world labels and live-guide layout, oriented the cathedral clock-side entrance toward Công xã Paris, added three wandering chat NPCs with secret quests, expanded the hub story across all eight destinations, and filled the landmark forecourts and river promenade with authored props.
- Pass 5 complete: added a second low-cost density layer for Opera, Post Office, City Hall, the park, and the riverside; added physical stop signs for Opera, Post Office, and the food alley; enriched all eight hub beats with named neighbors and destination-specific story hooks; fixed active secret-target precedence after full exploration; and added offline secret-quest parity coverage.
- Remaining verification limits: mobile active play remains above the starting 300k triangle budget because Bến Thành and the expanded crowd/props are visible together; physical Quest 3 hardware and a true zone-specific audio mix are not verified.
- Constraints: reuse the running dev server; request a user restart only if needed. Commit each validated pass. Physical Quest 3 performance requires hardware evidence.

## Decisions

- Stack: React Three Fiber, Three.js, Rapier, Bun, Node/Hono, shared Zod contracts.
- Meta endpoint: `https://api.meta.ai/v1/chat/completions`, via Mastra and `@ai-sdk/openai-compatible`.
- Meta model: `muse-spark-1.3-contributor`.
- Server secret: `META_MUSE_API_KEY`; it is not present in client source or build output.
- Project dates: October 27–November 4, 2026; submission November 4, 9 PM ET.
- Art direction: toy diorama from `assets/landmarks/chobenthanh.png`. Periwinkle sky, butter walls, terracotta roofs, mint trees. UI surfaces are toy blocks: ink edge, solid side face, roof-ridge header strip. Tokens live in `packages/shared/tokens.css`, shared by client and hub. Type: Baloo 2 (display) and Be Vietnam Pro (body), self-hosted with Vietnamese subsets.
- Runtime ports: client `58000`, server `58001`, Postgres `58002`.
- Hub placement: in-play overlay (header button, `H`) plus once after the first reward closes. `apps/design` deleted after the port. Persistence: anonymous guests and progress in Postgres 18.
- No deployment or public publishing has been performed.

## Passes

1. Complete: foundation, live/fallback agent backend, authored district, keyboard/touch movement, delivery quest, bus, reward, retry, and first production browser flow. Lint, types, build, and 21 tests passed.
2. Complete: XR entry/exit and controller locomotion, snap turn, world-space panels, XR HUD, mobile joystick QA, stale dialogue protection, soft city tint, foliage material correction, runtime asset pruning, audio lifecycle handling, visual canvas inspection, release checks, and the responsive Sài Gòn city hub in `apps/design`.
3. Complete: diorama design overhaul across the game UI (title, HUD, touch controls, dialogs, minimap and map labels on translucent pills, NPC name tags, quest marker, XR canvas panels, scene sky/fog) and the city hub (diorama hero with map pins, story road, neighbor, ride, pulse, and sound cards).

4. Complete: city hub inside the client (`ui/hub/`), driven by `hubView(state)`; story road, last neighbor line, cheapest affordable ride, places discovered, sound. `apps/design` and `scripts/qa-hub.mjs` retired.
5. Complete: young tourist player built from the Kenney mini-character pack.
6. Complete: compressed District 1 map (`world/district.ts`) with Tòa Thị Chính and Nhà thờ Đức Bà GLBs placed by OSM bearing, Nguyễn Huệ, Lê Thánh Tôn, Đồng Khởi, Công xã Paris, river skyline, five bus stops on a road-tree route, player-following shadow frustum, and an oriented minimap.
7. Complete: Mastra NPC harness per `docs/agent-harness.md`: `POST /npc/:npcId/interact`, backend-authoritative `GameService`, four tool-restricted agents, memory, event scheduler, fallbacks, limits. Old `/npc/chat|quest|verify` routes removed.
8. Complete: landmark sources moved to `assets/landmarks/`. They use Draco mesh compression; `prepare-assets.ts` registers the `draco3d` decoder, drops Draco from runtime copies, and no longer simplifies already-decimated meshes.
9. Complete: simplified Chợ Bến Thành (142k triangles) at `models/landmarks/cho-ben-thanh.glb`. All runtime models are Draco-compressed (edgebreaker); the decoder is self-hosted in `public/draco`.

## Current validation

- Root checks passed: `bun run check`, `bun run check:types`, `bun run build`, and `bun run test`.
- Server suite: 65 tests passed and one skipped. Client suite: 40 tests passed.
- Desktop production flow passed at `1440×900` with no page or console errors.
- Mobile production flow passed at `390×844`; joystick movement, reset, secret quest, hub, and no-overflow checks passed.
- Browser XR capability check passed; immersive VR stayed hidden when unsupported.
- Canvas captures passed for desktop active play, quest dialogue, reward, cathedral, City Hall, Opera House, Post Office, riverfront, food alley, and hub story views.
- Complete city-flow renderer observations: desktop `212 calls / 351,713 triangles`; mobile `158 calls / 344,438 triangles`.
- Audio harness passed unlock, click, pickup, board, arrival, reward, pause/resume, mute, restart, hidden-tab lifecycle, and missing-city fallback behavior.
- Client city-hub checks passed with desktop and mobile headless Playwright flows, including navigation, map stop selection, sound toggle, secret-quest status, and no page or console errors.
- Docker API image build passed.

## City hub integration (complete)

The hub (`apps/client/src/ui/hub/`) is a live client screen driven by game state. Tokens, fonts, and the diorama language are shared with the game.

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

Story steps: the trail covers all eight authored destinations; an active objective marks its destination current, visited destinations are done, and the wandering secret quests appear with available, active, or completed states.

### Phases

1. State and selector: `'hub'` screen, `lastLine`, `openHub()`/`closeHub()`, `H` binding, `hubView()` with vitest coverage of step rules and ride choice.
2. Port UI into `ui/hub/`, wire the header button and post-reward entry. Files ≤300 lines.
3. QA: extend `scripts/qa-game.mjs` to open the hub after delivery, assert coins and step text, open Journal from the hub, close back to play; desktop and 390px. Port overflow and font checks from `scripts/qa-hub.mjs`.
4. Retire `apps/design`, `scripts/qa-hub.mjs`, and port `58003` after the client hub passes QA.
5. Update `docs/game-design.md` and `docs/final-evidence.md`.

### Remaining work

- City expansion work is tracked in the current City expansion section above.
- Player: young tourist in the Kenney mini-character style. Source `assets/player-tourist/player-tourist.blend` (base `character-male-e`, authored sun hat, sunglasses, backpack, camera), built by `scripts/blender/build-tourist.py`; reuses the pack's 32 clips. Obsolete: the Tripo young-boy job (`artifacts/jobs/player-boy.json`, `assets/player-boy/`) was replaced at the user's request and is not used at runtime.

## Open follow-ups

- Physical Quest 3 verification requires hardware and was not performed.
- Deployment and public hosting verification remain outside this local pass.
- The historical failed mobile capture files remain under `artifacts/pass-2-mobile/failure.*`; the final mobile run passed and is recorded in `artifacts/pass-2-inspector/mobile-active-play.json`.

- 2026-10-31: Applied controlled bevel/smooth shading pass across 530 architectural meshes, re-saved blend and re-exported GLB; refreshed front and three-quarter previews.

- 2026-10-31: Tuned studio/world illumination toward the reference pastel presentation, re-saved source and re-exported GLB; front preview regenerated and verified.

- 2026-10-31: Added eight front tower arched trim curves aligned to the reference window groups; saved blend, re-exported GLB, and refreshed front render.

- 2026-10-31: Rebuilt central rose-window tracery with concentric rings and radial spokes to better match the ornate reference facade; saved/exported/rendered.

- 2026-10-31: Added matching terracotta arch trim to six side-window bays on both left and right elevations; blend/GLB export completed.

- 2026-10-31: Brightened brick, trim, and slate material values toward the reference palette; re-exported GLB and refreshed three-quarter preview.

- 2026-10-31: Added seven rear apse window openings with terracotta arch rings, breaking up the blank rear wall and matching the reference back-view rhythm; re-rendered rear preview.

- 2026-10-31: Added nine rear apse pilasters to articulate the curved wall between windows, then re-rendered rear validation.

- 2026-10-31: Added 24 clock-face tick markers across both front clocks for closer reference detail; re-exported GLB and refreshed front render.

- 2026-10-31: Added twelve sloped slate side-canopy planes over the left/right bay rhythm to better match the reference shed-roof silhouette; refreshed three-quarter render.

- 2026-10-31: Added twelve terracotta side-buttress cap blocks across both side elevations; saved the editable blend and re-exported the portable GLB. Three-quarter preview refreshed for inspection.

- 2026-10-31: Structural refinement pass: added paired side transept bodies, gabled pediments, rose discs, and three apse roof-curve rings; hid roof-rib/eave strips and side trim/cap artifacts that read as railings; saved blend, re-exported GLB, and refreshed three-quarter preview.

## Persistence and NPC harness

- Guest bearer tokens are stored as SHA-256 hashes; browser storage keeps the opaque token.
- Postgres 18 owns saves, one-time quest completions, bounded NPC facts, daily model spend, and greeting cache. Mastra threads use the same pool in the `mastra` schema.
- Startup applies generated Drizzle migrations and sweeps guests unseen for 30 days. `/health` verifies the database; storage failures return 503.
- Greetings use tool-free short generations, cache by persona/model/time bucket, and write the opening exchange into the conversation thread. `prewarm` fills 16 keys.
- Validation: root lint/types/build/tests; 30 server + 14 client tests; real Postgres concurrency/persistence integration; Docker image build. Headless production desktop solo quest/bus/reward/reset and 390px touch/hub flows passed with no errors. Guest reload retained name and 80 coins; reset retained identity and restored 30 coins at both widths.
- Shared-world pass complete: public rooms, presence, emotes, NPC room lines, reconnects, and event acknowledgements. Parties and the team lunch errand are implemented and validated.


## Shared world

- `/ws` uses protocol 1, origin checks, 4 KB messages, hello timeout, 400 connection cap, single active socket per guest, public 20-player rooms, retained disconnects, and 10 Hz snapshots.
- Client presence is a mutable interpolation buffer: nearest eight players within 45 units, six on mobile, 150 ms delay. The People panel shows room/connection/player count; Q and touch controls send fixed emotes without stopping movement.
- NPC proximity barks use one tool-free step, daily bark limits, scheduler cooldowns, and authored fallback lines. State/event batches are sequenced and serialized per retained room member across reconnects.
- Validation: 43 server tests plus 13 realtime cases; 21 client tests; lint/types/build passed. Bun and Node websocket welcome/shutdown smoke passed. Two-context desktop + 390px headless QA saw both guests, room presence, wave propagation, no console errors, and no mobile overflow. Evidence: `artifacts/pass-multiplayer/`.


## Co-op

- Parties hold 2–4 connected neighbors, validate same room and eight-unit proximity on invitation/acceptance, expire invitations after 30 seconds, and retain disconnected members for 60 seconds.
- Cô Hoa’s `hoa-team-lunch` assigns noodles, broth, baguette, and coffee in join order. Assignments live on the party. Each member delivers their own dish to Chị Linh. Cô Hoa’s check grants each assigned member 40 coins, a photo, and +2 reputation once through a transactional completion row.
- Solo herb quest remains independent. Party leave/reset removes assignments and cancels the errand when fewer than two remain. Canonical team tools and deterministic team controls use the same backend validation.
- Save revisions fence stale HTTP/socket snapshots. Party versions fence late HTTP party snapshots. Controlled tests reproduced both ordering failures before the fix; 38 client tests now pass.
- Final gates: lint → types → build → tests, real Postgres integration, Docker API build. Server: 58 passing tests plus the separately executed integration test. Client: 38 passing tests.
- Production preview + Compose API/Postgres: desktop and 390px contexts invited/accepted with real controls, received distinct dishes, delivered via NPC buttons, saw +40 coins/photo/+2 reputation, and reloaded with the same guest names and 70 coins. Existing debug teleport is used only to position the two guests at NPCs; quest/party/reward mutations use real controls. Solo production bus/herb/reward flow and guest reset/reload also passed.
- Evidence: `artifacts/pass-coop/`, `artifacts/pass-coop-solo/`, `artifacts/pass-coop-mobile/`, and `artifacts/pass-persistence/server-restart.json`.
- Runtime topology remains one API replica. Rooms and parties end on API restart; saved journeys remain. No deployment or public hosting was performed.


## Refactor pass 1: toolchain upgrade and deprecated-API migration

- Pinned latest stable releases: Biome 2.6.4, @types/three 0.187.0, @electric-sql/pglite 0.5.13, @ai-sdk/openai-compatible 3.0.82, @mastra/core 1.81.0, @mastra/memory 1.40.0, @mastra/pg 1.34.0.
- Bun 1.4.4 across packageManager, mise.toml, the Dockerfile build stage, and AGENTS.md. Runtime image moved to node:26-alpine. Postgres stays on postgres:18-alpine (19 still beta/rc).
- Dropped @typescript/native-preview; every check:types script now runs the native `tsc -b` shipped with typescript 7.0.2.
- Biome migrated to 2.6.4 schema. Enabled suspicious.noDeprecatedImports and suspicious.noImportCycles as errors, set yaml.formatter.quoteStyle to single, and turned off performance.useDomNodeTextContent for scripts/** (Playwright innerText assertions). Applied 2.6 default formatting, including markdown.
- Deprecated-API migrations in our code: TanStack useStore → useSelector; React FormEvent → SubmitEvent<HTMLFormElement> in the conversation form; <Canvas shadows="percentage"> with the onCreated shadow-type line removed; removed no-op Zod .finite() calls in shared/multiplayer.ts; biome-ignore with reason on the drizzle primaryKey import (object overload in use); broke the places ↔ routes cycle (places stops re-exporting route, consumers import from routes). Client Vite config now uses vitest/config with ssr.resolve.mainFields and test.server.deps.inline, removing the THREE_CJS_DEPRECATED warning.
- Runtime behavior, DOM, and wire contracts unchanged. Gate passed: check → check:types → build → test. Test totals unchanged (server 65 passed + 1 skipped; client 45 passed).


## Refactor pass 2: server feature slices

- Layered the server as app → features → domain → shared. Files inside a slice import siblings directly; code outside a slice (tests included) imports only through the slice index.ts, using the @/* alias.
- Layout: app/ (index.ts createApp/AppType, realtime.ts createRealtime wiring); features/ (npc, party, realtime); domain/game (GameService, quests, intents, team, ToolOutcome); shared/ (config, logger, http Fetcher, db).
- Removed same-layer and inverted imports: ToolOutcome moved into domain/game; party depends on a structural PartyRooms interface instead of RoomManager; RoomManager takes a structural NpcBarker instead of NpcHarness; NpcScheduler moved to features/realtime. The party message type is now PartyClientMessage in @saigon/shared, used by both client and server.
- Path updates: package export → ./src/app/index.ts; drizzle.config schema → ./src/shared/db/schema.ts; the createDb source-relative migrations candidate → ../../../drizzle; docs/meta-api.md GameService path.
- Added @/* alias to tsconfig paths and a vitest.config.ts with resolve.tsconfigPaths: true (listed in the tsconfig include).
- Test splits (all under 500 lines): party.spec.ts → party-invites.spec.ts + team-errand.spec.ts + test/support/party.ts; harness.spec.ts → harness.spec.ts + harness-greetings.spec.ts + scheduler.spec.ts + test/support/npc.ts; realtime.spec.ts → realtime.spec.ts + realtime-rooms.spec.ts + test/support/peer.ts.
- Enabled style.noExcessiveLinesPerFile (maxLines 500) now that every source file is under the cap.
- Runtime behavior, DOM, and wire contracts unchanged. Gate passed: check → check:types → build → test. Server test total unchanged (65 passed + 1 skipped); client 45 passed. Real-Postgres integration passed with the new migrations path.


## Refactor pass 3: client feature slices

- Layered the client as app → widgets → features → shared, with the shared segments ordered world → runtime → audio → ui → three → xr → state → api. Same-slice files import siblings directly; cross-slice code imports through the @/* alias and, for feature/widget consumers, through each slice index.ts.
- Layout: app/ (main.tsx entry, app.tsx, scene.tsx, game-ui.tsx, title-screen.tsx, actions.ts, test-hooks.ts, diagnostics.tsx, styles.css ordered aggregator); widgets/ (hud with header, objective, people, party, touch, panels; hub; xr-hud); features/ (city, player, npcs, conversation, transport, market, postcard, journal, map); shared/ (world, runtime, audio, ui, xr, state, api).
- index.html now loads /src/app/main.tsx. ui/index.tsx split into app/title-screen.tsx, widgets/hud/objective.tsx, and app/game-ui.tsx; main.tsx split into app/app.tsx (App, GameBoundary) and a thin app/main.tsx bootstrap. CSS consolidated under shared/ui with app/styles.css as the ordered aggregator; removed inline css imports from people and hub.
- Added @/* alias to tsconfig paths and Vite resolve.tsconfigPaths: true. XRGameHud became a widget (widgets/xr-hud) and is no longer re-exported from the shared xr barrel.
- Runtime behavior, DOM, and wire contracts unchanged. Gate passed: check → check:types → build → test (server 65 passed + 1 skipped; client 45 passed). Headless Playwright desktop and 390px flows loaded and played with zero page/console errors and zero failed requests.
