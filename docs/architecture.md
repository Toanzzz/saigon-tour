# Design — Saigon Tour

## 1. Principles

1. **Demo-first.** A reliable vertical slice beats broad, unfinished features.
2. **One codebase, two targets.** Desktop and Quest 3 WebXR share game logic; input and UI differ.
3. **Secrets stay server-side.** The Meta key lives only in the API's environment.
4. **Agentic, server-authoritative.** NPCs act through validated tools; rewards come from quest
   templates, never from model text.
5. **Fail soft.** Every AI path has a deterministic in-character fallback.

## 2. Stack

| Layer      | Choice                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------- |
| Client     | Vite, React, three.js, React Three Fiber, drei, Rapier, `@react-three/xr`                |
| Data/state | TanStack Query (API), TanStack Store (game state)                                        |
| API        | Node + Hono in a Docker image; `export type AppType` for `hc<>`; `ws` realtime           |
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
        └──────────── /ws realtime ─────────┤
                                            ▼
                                         Postgres (auth users, journeys, spend, NPC memory)
```

API routes: `GET /health`, `GET /auth/providers`, Better Auth under `/auth/*`, `GET /me`,
`POST /me/profile`, `POST /me/reset`, `POST /npc/:npcId/interact`, `GET /ws`. Details: `docs/meta-api.md`, `docs/multiplayer.md`.

## 4. Client

Layers flow `app → widgets → features → shared`; each slice exposes `index.ts`.

- **Player:** WASD, mouse-look, sprint, interact; mobile joystick; XR locomotion and snap turn.
- **Conversation:** NPC dialogue with thinking state, timeout, and offline fallback lines.
- **Transport:** `TravelMode = 'bus' | 'metro' | 'xeom' | 'cyclo'`; pick destination → fare →
  ride with the camera on the vehicle → arrive.
- **World state:** location, coins, items, reputation, quests. After each NPC turn the client
  replaces it with the server's authoritative `world`.
- **Multiplayer:** public street rooms, remote tourists, emotes, parties (2–4) and the team lunch errand.
- **XR:** world-space panels and XR HUD; the DOM hub is hidden in XR.

## 5. NPC agents

`POST /npc/:npcId/interact` takes `{ playerId, message, intent, events, worldContext }`.
`intent`: `chat | help | check | greet | team`. `events`: `visit | talk | deliver | spend`.

- Each NPC is a Mastra agent with a persona and only the tools its role needs:
  `offer-quest`, `check-quest`, `remember-player-fact`, `get-world-context`.
- `GameService` validates every tool call (template, giver, objective) and owns rewards.
- Objectives: `GO_TO(locationId)`, `TALK_TO(npcId)`, `DELIVER(itemId, npcId)`; completion
  checks are deterministic.
- Memory: last 10 messages per `npcId:playerId` thread plus up to 12 remembered facts, stored in Postgres.
- Guards: per-step/turn timeouts, unsafe-text rejection, per-player/NPC/process rate limits,
  `META_SPEND_LIMIT_USD` (default $5, max $150), daily bark limit.
- Pre-warm: `bun run --filter @saigon/server prewarm` caches greetings.

## 6. NPCs

| NPC      | Role                         | Location   | Quest tools |
| -------- | ---------------------------- | ---------- | ----------- |
| Cô Hoa   | Market food vendor           | market     | yes         |
| Anh Tâm  | Neighborhood xe ôm driver    | market     | no          |
| Chị Linh | Student and volunteer        | park       | no          |
| Ông Ba   | Cyclo driver and storyteller | river      | no          |
| Mai      | Sidewalk café owner          | market     | no          |
| Alex     | Visiting photographer        | opera      | no          |
| Vy       | Lantern maker                | cityhall   | yes         |
| Sơn      | Postcard collector           | postoffice | yes         |
| Thảo     | Opera House music student    | opera      | yes         |

Source of truth: `packages/shared/src/world.ts` and `apps/server/src/features/npc/agents/`.

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
