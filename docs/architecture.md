# Design — Saigon Tour

## 1. Principles

1. **Demo-first.** A reliable vertical slice beats broad, unfinished features.
2. **One codebase, two targets.** Desktop and Quest 3 WebXR share game logic; input and UI differ.
3. **Secrets stay server-side.** The Meta key lives only in the API's environment.
4. **Agentic, server-authoritative.** NPCs act through validated tools; rewards come from the deterministic quest engine.
5. **Fail soft.** Every AI path has a deterministic in-character fallback.

## 2. Stack

| Layer      | Choice                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------- |
| Client     | Vite, React, three.js, React Three Fiber, drei, Rapier, `@react-three/xr`                |
| i18n       | Paraglide JS 2 catalogs (`apps/client/messages`): English and Vietnamese                 |
| Data/state | TanStack Query (API), TanStack Store (game state)                                        |
| API        | Node + Hono in a Docker image; `export type AppType` for `hc<>`; Colyseus realtime       |
| Agents     | Mastra (`@mastra/core`, `@mastra/memory`, `@mastra/pg`) via `@ai-sdk/openai-compatible`  |
| Model      | Meta `muse-spark-1.3-contributor` (`META_MODEL` overrides)                               |
| Storage    | Postgres 18 with Drizzle migrations                                                      |
| Identity   | Better Auth: anonymous sessions, Meta (Facebook Login) linking, bearer + cookie sessions |
| Contracts  | zod 4 in `packages/shared` (raw TS)                                                      |
| Hosting    | Client: Cloudflare Worker (workers.dev). API: Docker on t-oracle behind Caddy, CORS      |

Toolchain: Bun 1.4.4 workspaces (isolated linker), TypeScript 7 (`tsc -b`, composite project per
package), Biome 2.6.x, Vitest. Backend logs use the 7-key structured logger.

Unity + Meta XR SDK was rejected: two build pipelines and APK sideloading for a solo, time-boxed build.

## 3. Architecture

```
Client (desktop + WebXR) ──HTTPS JSON──▶ API (Hono, Docker) ──▶ Meta Model API
        │                                   │
        └──────── Colyseus realtime ────────┤
                                            ▼
                                         Postgres (auth users, journeys, spend, NPC memory)
```

API routes: `GET /health`, `GET /auth/providers`, Better Auth under `/auth/*`, `GET /me`,
`POST /me/profile` (`{ name, body }`), `POST /me/equip`, `POST /me/reset`,
`POST /me/quests/:questId/abandon`, `POST /npc/:npcId/interact`, `GET /npc/:npcId/history`,
`POST /matchmake/:method/world` (Colyseus), and `GET /realtime/status`. Details:
`docs/meta-api.md`, `docs/multiplayer.md`.

## 4. Client

Layers flow `app → widgets → features → shared`; each slice exposes `index.ts`.

- **Player:** WASD/arrows, drag-to-look, sprint, interact; mobile joystick; XR locomotion and snap turn.
- **Conversation:** NPC dialogue with thinking state, timeout, and offline fallback lines.
- **Transport:** `TravelMode = 'bus' | 'metro' | 'xeom' | 'cyclo'`; pick destination → fare →
  ride with the camera on the vehicle → arrive.
- **World state:** location, coins, items, reputation, quests. After each NPC turn the client
  replaces it with the server's authoritative `world`.
- **Multiplayer:** one shared world room (20 players) with a waiting notice when full, remote tourists, emotes, parties (2–4) with invitations and presence.
- **Avatar and wardrobe:** a man or woman body chosen with the title toggle and carried in presence as `body`. Six outfits have body-specific rigged garment models and clothing palettes. Explicit bone anchors fit hats/accessories; personal rides use a driving pose. Wardrobe uses one live fitting canvas and body-specific WebP card thumbnails; equips remain ownership-checked on the server. Development-only quest/Wardrobe inspectors use isolated stores and no gameplay API calls.
- **City:** room-authoritative NPC anchors, activities, events, needs, headlines, and weather. The hub exposes City pulse; rain uses tint/fog. NPC proximity follows synchronized positions.
- **World render look:** a comic papercraft look is the default. World materials pass through a shared 3-step `MeshToonMaterial` ramp (`shared/world/toon.ts`); glow, neon, and signs stay unlit `MeshBasicMaterial` with `toneMapped={false}` via `<Blocks unlit>`. Colour tokens live in `shared/world/palette.ts`; sky colour, fog, and the hemisphere light live in `features/city/atmosphere.tsx`. ACES tone mapping is kept. `?look=classic` restores the original Standard-material look for A/B and rollback; the frozen flag is read once at boot (`shared/world/look-flag.ts`). A comic-only gradient sky dome, drifting paper clouds, cutout skyline cards, and a paper diorama base build the shadowbox depth; the title screen frames the district through a long lens.
- **XR:** world-space panels and XR HUD; the DOM hub is hidden in XR.
- **i18n:** locale comes from the saved choice, then a `vi*` browser, then `en`. Switching remounts only the DOM UI; NPC requests carry `locale`.
- **Client state:** module-level TanStack Stores with explicit resets. `shared/state/game.ts` holds the game; `shared/state/ui.ts` holds UI drafts (name, journey confirm, transport form, chat, wardrobe tab, clock), seeded and cleared on game transitions by `installUiResets()`; `shared/state/view.ts` and `shared/api/presence-view.ts` hold frame-derived values (player animation, touch knob, NPC labels, remote presence), each written only on change by a single ticker or handler. Per-frame simulation data stays mutable. Pending flags come from `useMutation`. `GameUI` ignores position-only changes unless the nearest interact target moves. Rules: `apps/client/AGENTS.md`.

## 5. NPC agents

`POST /npc/:npcId/interact` takes `{ message, intent, locale, events, worldContext, messageId?, sentAt? }` and derives player identity from the authenticated session. Intents are `chat | open | milestone` (`greet` aliases open; `help` and `check` are accepted as chat); events are `visit | talk | deliver | purchase | spend`.

- All 29 NPCs (nine neighbors, twenty residents) have `propose-quest`, `drop-quest`, `adjust-friendliness`, `get-context`, and `remember-player-fact`.
- `QuestService` owns player mutations, validates proposals against shared persona domains, completes ready quests on any interaction with the giver, and grants rewards once through durable completion records.
- Party quests share an id and original recipient list, with separate per-player progress. Completion locks recipient saves together and grants/pushes rewards once per member. Abandon removes the player’s copy and reclaims remaining supplied deliveries.
- Quests contain one to three sequential `GO_TO`, `TALK_TO`, `DELIVER`, or `BUY` steps. Each player has at most three active quests; an accepted offer activates immediately and supplies delivery items.
- `packages/shared/src/quest` owns schemas, allowlists, validation, progress, deterministic rewards, and fallback seeds. The offline client uses the same engine.
- Memory: Mastra Observational Memory per `npcId:playerId` thread, at most forty raw messages, and up to twelve remembered facts, stored in Postgres. Details: `docs/agent-harness.md`.
- Guards: bounded model steps and timeouts, unsafe-text rejection, per-player/NPC/process call limits, reserved daily spend, and bark counts.

### City Director

The world room runs its director once per UTC day, while occupied. The daily run reads Ho Chi Minh City news and the city snapshot, then drafts a script of timed beats for the whole day; each beat applies when its time arrives, with no further model calls. News sets the day's mood and may lightly theme a mini-game or event, reframed into a wholesome neighborhood moment rather than copied verbatim. `CityWorld` validates event limits, authored anchors, safe text, needs, and weather, and also dry-validates planned beats before they are scheduled. The daily run uses the shared spend reservation plus a daily director count. `DIRECTOR_MODE=scripted` selects a deterministic demo day plan; `off` disables the director. Live failures or an exhausted budget fall back to the scripted day plan. The news feed defaults in code to `https://vnexpress.net/rss/thoi-su.rss`; `DIRECTOR_NEWS_URL` overrides it, and an empty value disables news.

Colyseus patches carry placements, activity IDs and lifetimes, events, needs, headlines, and weather. A `city-headline` message announces each headline. NPC agents see the current snapshot and their own need in context. City state lasts for the room’s lifetime; player quests remain durable in Postgres.

## 6. NPCs

Nine neighbors:

| NPC      | Role                               | Home       |
| -------- | ---------------------------------- | ---------- |
| Cô Hoa   | Market food vendor                 | market     |
| Anh Tâm  | Neighborhood driver                | market     |
| Chị Linh | Student and neighborhood volunteer | park       |
| Ông Ba   | Cyclo driver and storyteller       | river      |
| Mai      | Sidewalk café owner                | market     |
| Alex     | Visiting photographer              | opera      |
| Vy       | Lantern maker near City Hall       | cityhall   |
| Sơn      | Postcard collector                 | postoffice |
| Thảo     | Opera House music student          | opera      |

Twenty residents walk the district (`packages/shared/src/residents*.ts`). Every NPC can author and complete quests. Server-enforced domains and seed examples define each persona’s reach. Source: `packages/shared/src/world.ts`, `packages/shared/src/quest`, and `apps/server/src/features/npc`.

## 7. Performance

Low-poly assets, Draco/WebP runtime models (`bun run prepare:assets`), capped crowd and remote
players, no heavy post-processing in XR. Targets: ≥ 60 FPS desktop, ≥ 72 FPS Quest 3.

## 8. Repository layout

```
apps/client/src/{app,widgets,features,shared}
apps/server/src/{app,domain,features,shared}   # + Dockerfile, drizzle/, test/
packages/shared/src                            # zod contracts; derives NPC tables from the registry
packages/npc-kit                               # NPC id lists, defineNpc/defineResident, residentPrompt
packages/npc-<id>                              # one package per NPC: profile, story, unlocks, look, place, persona, assets
assets/                                        # licensed source models (LICENSES.md)
scripts/                                       # asset prep, Blender builds, QA, credentials
docs/                                          # specs, design, progress, evidence
wrangler.jsonc                                 # asset-only Worker for apps/client/dist
compose.yaml                                   # Postgres (58002); API profile (58001)
compose.prod.yml                               # host stack: Postgres + API on the edge network
.github/workflows/deploy.yml                   # verify → image → api → client on push to main
```

## 9. NPC packages

Each of the 29 NPCs owns its content in `packages/npc-<id>/` (directory slug = NPC
id, which is persisted in DB rows and Mastra threads). A package exports a default
`NpcDefinition` built with `defineNpc`/`defineResident` from `@saigon/npc-kit`
(profile, story, unlocks, look, place) plus a server-only `./persona` prompt body.

- `packages/shared/src/npcs/registry.ts` imports all 29 defaults; a `satisfies`
  guard fails the build if an id is missing or unknown.
- `packages/shared/src/npcs/derive.ts` rebuilds every legacy export (`NPCS`,
  `NPC_NAMES`, `NEIGHBOR_TEXT`, `RESIDENT_TEXT`, `RESIDENTS`, `RESIDENT_ANCHORS`,
  `NPC_POSITIONS`, `QUEST_SEEDS`, `QUEST_DOMAINS`, unlock arrays, `GIVER_UNLOCKS`)
  from the registry, plus a new `NPC_LOOKS` that drives the client's `PEOPLE` and
  `RESIDENT_VISUALS` and the portrait background.
- Prompts live behind the server-only subpath `@saigon/shared/personas`
  (`NPC_PROMPTS`), so no prompt text reaches the client bundle. The server appends
  `SHARED_RULES` as before.
- `packages/npc-<id>/assets` may ship a world model (`model/<id>.glb`) and a square
  portrait (`avatar/portrait.*`); `scripts/prepare-assets.ts` emits the runtime
  copies. Scaffold a new NPC with `bun scripts/new-npc.ts <id> [neighbor|resident]`.

## 10. Open decisions

- **D1.** Optional desktop/mobile voice uses a server-authenticated Meta transcription route. The browser converts recordings to 24 kHz mono PCM16 WAV; transcripts enter the existing NPC turn. Configuration gates availability. VR voice and spoken NPC replies are outside this slice.
- **D2.** Open-weight endpoint (Muse Spark Open) not wired; `META_API_URL` can point to one.
