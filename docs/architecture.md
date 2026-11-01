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
| Data/state | TanStack Query (API), TanStack Store (game state)                                        |
| API        | Node + Hono in a Docker image; `export type AppType` for `hc<>`; Colyseus realtime       |
| Agents     | Mastra (`@mastra/core`, `@mastra/memory`, `@mastra/pg`) via `@ai-sdk/openai-compatible`  |
| Model      | Meta `muse-spark-1.3-contributor` (`META_MODEL` overrides)                               |
| Storage    | Postgres 18 with Drizzle migrations                                                      |
| Identity   | Better Auth: anonymous sessions, Meta (Facebook Login) linking, bearer + cookie sessions |
| Contracts  | zod 4 in `packages/shared` (raw TS)                                                      |
| Hosting    | Client: Cloudflare asset-only Worker. API: separate HTTPS origin, credentialed CORS      |

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
`POST /me/profile`, `POST /me/reset`, `POST /npc/:npcId/interact`, `POST /matchmake/:method/world`
(Colyseus). Details: `docs/meta-api.md`, `docs/multiplayer.md`.

## 4. Client

Layers flow `app → widgets → features → shared`; each slice exposes `index.ts`.

- **Player:** WASD, mouse-look, sprint, interact; mobile joystick; XR locomotion and snap turn.
- **Conversation:** NPC dialogue with thinking state, timeout, and offline fallback lines.
- **Transport:** `TravelMode = 'bus' | 'metro' | 'xeom' | 'cyclo'`; pick destination → fare →
  ride with the camera on the vehicle → arrive.
- **World state:** location, coins, items, reputation, quests. After each NPC turn the client
  replaces it with the server's authoritative `world`.
- **Multiplayer:** public street rooms, remote tourists, emotes, parties (2–4) with invitations and presence.
- **City:** room-authoritative NPC anchors, events, needs, headlines, and weather. The hub exposes City pulse; rain uses tint/fog. NPC proximity follows synchronized positions.
- **XR:** world-space panels and XR HUD; the DOM hub is hidden in XR.

## 5. NPC agents

`POST /npc/:npcId/interact` takes `{ message, intent, events, worldContext }` and derives player identity from the authenticated session. Intents are `chat | help | check | greet`; events are `visit | talk | deliver | purchase | spend`.

- All nine NPCs have `propose-quest`, `check-quests`, `get-context`, and `remember-player-fact`.
- `QuestService` owns player mutations, validates proposals against shared persona domains, and grants rewards once through durable completion records.
- Quests contain one to three sequential `GO_TO`, `TALK_TO`, `DELIVER`, or `BUY` steps. Each player has at most three active quests; an accepted offer activates immediately and supplies delivery items.
- `packages/shared/src/quest` owns schemas, allowlists, validation, progress, deterministic rewards, and fallback seeds. The offline client uses the same engine.
- Memory: last ten messages per `npcId:playerId` thread plus up to twelve remembered facts, stored in Postgres.
- Guards: bounded model steps and timeouts, unsafe-text rejection, per-player/NPC/process call limits, reserved daily spend, and bark counts.

### City Director

Each occupied room runs a director at most once per ninety seconds through the NPC scheduler. `CityWorld` validates event limits, authored anchors, safe text, needs, and weather. Model calls use the shared spend reservation plus a daily director turn count. `DIRECTOR_MODE=scripted` selects deterministic demo beats; `off` disables the loop. Live failures use the validated scripted beat list.

Colyseus patches carry placements, events, needs, headlines, and weather. A `city-headline` message announces each headline. NPC agents see the current snapshot and their own need in context. City state lasts for the room’s lifetime; player quests remain durable in Postgres.

## 6. NPCs

| NPC      | Role                         | Home       |
| -------- | ---------------------------- | ---------- |
| Cô Hoa   | Market food vendor           | market     |
| Anh Tâm  | Xe ôm driver                 | market     |
| Chị Linh | Volunteer                    | park       |
| Ông Ba   | Cyclo driver and storyteller | river      |
| Mai      | Café owner                   | market     |
| Alex     | Photographer                 | opera      |
| Vy       | Lantern maker                | cityhall   |
| Sơn      | Postcard collector           | postoffice |
| Thảo     | Music student                | opera      |

Every NPC can author and verify quests. Server-enforced domains and seed examples define each persona’s reach. Source: `packages/shared/src/world.ts`, `packages/shared/src/quest`, and `apps/server/src/features/npc`.

## 7. Performance

Low-poly assets, Draco/WebP runtime models (`bun run prepare:assets`), capped crowd and remote
players, no heavy post-processing in XR. Targets: ≥ 60 FPS desktop, ≥ 72 FPS Quest 3.

## 8. Repository layout

```
apps/client/src/{app,widgets,features,shared}
apps/server/src/{app,domain,features,shared}   # + Dockerfile, drizzle/, test/
packages/shared/src                            # zod contracts and world data
assets/                                        # licensed source models (LICENSES.md)
docs/                                          # specs, design, progress, evidence
wrangler.jsonc                                 # asset-only Worker for apps/client/dist
compose.yaml                                   # Postgres (58002); API profile (58001)
```

## 9. Open decisions

- **D1.** Voice (Muse Transcribe) only if time remains.
- **D2.** Open-weight endpoint (Muse Spark Open) not wired; `META_API_URL` can point to one.
- **D3.** Public API hostname and TLS proxy for deployment.
