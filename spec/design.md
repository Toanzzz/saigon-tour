# Design — Saigon Tour

## 1. Guiding principles

1. **Demo-first.** Every architectural choice optimizes for a reliable, visually striking
   3-minute demo. A guaranteed vertical slice beats a half-finished broad feature set.
2. **One codebase, two targets.** Desktop and Quest 3 VR share the same game logic; only
   input and rendering presentation differ.
3. **Secrets stay server-side.** No Meta API key ever ships in a client build. All AI calls
   go through a thin backend proxy.
4. **Agentic, not scripted.** NPCs decide quests and reward outcomes through the model with
   structured outputs — the agent loop is the headline feature.
5. **Fail soft.** Every AI path has a deterministic fallback so a flaky network never breaks
   the live demo.

## 2. Technology stack

### Chosen stack: Web + WebXR, three.js + React Three Fiber (LOCKED)

**Decision (D1, resolved):** Web + WebXR using **three.js + React Three Fiber (R3F) +
@react-three/xr**, full **TypeScript**, in a **monorepo**, built by a **solo** developer.

Rationale: a single codebase runs on both desktop browsers and Quest 3 (the Quest browser
supports WebXR natively — no store review, no APK sideloading, a URL is the whole "install"),
which de-risks the P2 VR goal and maximizes iteration speed for a solo dev under an 8-day
deadline. R3F gives a declarative React component model and a large ecosystem (drei, Rapier,
TanStack Store/Query), and `@react-three/xr` wraps WebXR sessions, controllers, hands, and
teleport. Toolchain and conventions follow the house defaults (see "Toolchain & conventions"
below).

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Renderer | **three.js** via **@react-three/fiber** | Declarative scene graph; huge ecosystem. |
| Helpers | **@react-three/drei** | Cameras, controls, loaders, HTML/world-space UI, etc. |
| XR | **@react-three/xr** | WebXR sessions, controllers, hands, teleport, origin. |
| Language | **TypeScript ^7** (tsgo, `strict`) everywhere | Shared types for structured AI payloads across client/server. |
| Build | **Vite** (+ `@vitejs/plugin-react`) | Fast HMR; `vite --https` for WebXR on Quest. |
| Physics | **Rapier** via **@react-three/rapier** | Player collider + walkable surfaces. |
| UI (desktop) | React DOM overlay | HUD, dialogue text input. |
| UI (VR) | drei `Html`/world-space meshes + `@react-three/xr` interactions | World-space dialogue panels, ray-select. |
| Data | **TanStack Query** (`@tanstack/react-query`) | All backend fetching/mutations (AI calls). |
| State | **TanStack Store** (`@tanstack/store` / `@tanstack/react-store`) | Quests, inventory, NPC memory, world state; React components hold presentation only. |
| Backend | **Node.js + Hono** (TypeScript), shipped as a **Docker image** | Holds Meta key, brokers agent calls, validates output; `export type AppType` for the `hc<>` client. |
| Validation | **zod v4** (shared package) | One schema source for client + server structured outputs. |
| Monorepo | **Bun workspaces** (`bun@1.4.2`, isolated linker, `bun.lock`) | `apps/client`, `apps/server`, `packages/shared`; `workspace:*` deps, raw-TS internal packages. |
| Assets | Low-poly GLTF (CC-licensed) + optional Muse Image textures | Fast to compose, VR-friendly. |

### Toolchain & conventions

- **Bun only** (`bun@1.4.2`) with its default **isolated** linker — never npm/pnpm/yarn.
  Workspaces are `apps/*` + `packages/*`; internal packages export raw TS via `workspace:*`.
- **Biome 2.5.x** for lint + format: single quotes, `semicolons: asNeeded`, `trailingCommas:
  es5`, 2-space, organizeImports on, `suspicious.noConsole: error` (off for the logger + tests).
- **TypeScript ^7** via `tsgo`, `strict`, `moduleResolution: Bundler`, `noEmit`. One
  `tsconfig.base.json`, a root solution file of `references`, and a **composite project per
  package**; apart from `extends`, nothing reaches outside its own package (share by making a
  package). `tsc -b` is the typecheck.
- **Backend logging**: 7-key structured logger (`_timestamp, level, event, service_name,
  trace_id, span_id, message`); `event` is `snake_case` `<subject>_<outcome>`.
- **Backend tests**: `vitest` with Node environment (standard container service — no Workers
  pool), tests in `apps/server/test/*.spec.ts`.

### Alternative considered: Unity (URP) + Meta XR SDK — rejected

Stronger native Quest performance, but two build pipelines (desktop + Android/Quest), slower
iteration, and APK sideloading for every VR test. Rejected for a solo, time-boxed build in
favor of the single-codebase WebXR path above.

## 3. High-level architecture

```
┌──────────────────────────── Client (shared TS game core) ────────────────────────────┐
│                                                                                        │
│  Platform layer         Game core (shared)                       Rendering            │
│  ┌───────────────┐      ┌─────────────────────────────┐          ┌──────────────────┐ │
│  │ DesktopInput  │─────▶│ PlayerController            │────────▶ │ Desktop renderer │ │
│  │ (WASD/mouse)  │      │ TransportSystem            │          │ (2D HUD overlay) │ │
│  ├───────────────┤      │ QuestSystem / Inventory    │          ├──────────────────┤ │
│  │ XRInput       │─────▶│ NpcAgentClient ────────────┼───┐      │ VR renderer      │ │
│  │ (controllers/ │      │ WorldState / DemoSeed      │   │      │ (world-space UI) │ │
│  │  hands/voice) │      └─────────────────────────────┘   │      └──────────────────┘ │
│  └───────────────┘                                        │                           │
└───────────────────────────────────────────────────────────┼───────────────────────────┘
                                                             │ HTTPS (JSON)
                                                             ▼
                        ┌──────────── Backend AI proxy (Node + Hono, Docker) ────────────┐
                        │  POST /npc/chat    → dialogue turn (streamed or whole)         │
                        │  POST /npc/quest   → propose structured quest                  │
                        │  POST /npc/verify  → judge objective completion + reward       │
                        │  POST /voice/stt   → Muse Transcribe (optional)                │
                        │  GET  /health                                                  │
                        │                                                                │
                        │  PromptBuilder · OutputValidator · Rate/CostGuard · Cache      │
                        └───────────────┬────────────────────────────────────────────────┘
                                        │  Meta Model API (key server-side)
                                        ▼
                     Muse Spark (dialogue/agent) · Muse Transcribe (STT) ·
                     [optional] Muse Spark Open (open-weight) · Muse Image (assets)
```

## 4. Client game core (shared modules)

### 4.1 PlayerController
- Owns the player collider, movement state machine: `WALKING | RIDING | IN_DIALOGUE`.
- Desktop: WASD + mouse-look + sprint + interact. VR: locomotion (teleport / smooth +
  snap-turn) from XRInput.
- Raycasts forward for interactables; emits `InteractableFocused` events to drive prompts.

### 4.2 InteractionSystem
- Detects proximity/aim to NPCs, transport stops, and objects.
- Shows contextual prompt ("Talk", "Board bus", "Pick up").
- Routes the interact action to the relevant system.

### 4.3 NpcAgentClient (the headline feature)
- Each NPC has a **persona record** (see §6) and a short **memory buffer** (recent turns +
  known facts about the player/quests).
- Three agent operations, all delegated to the backend:
  1. **chat** — produce the next in-character line.
  2. **quest proposal** — when the conversation warrants, the model returns a structured
     `Quest` object (validated against a schema).
  3. **verify** — given a quest + current world state + the player's claim, the model (or a
     deterministic check, whichever is cheaper) decides `COMPLETE | INCOMPLETE | PARTIAL`
     and the reward to grant.
- Maintains a **thinking indicator** and a **timeout fallback** (Requirement 3.5/3.7).
- Never trusts raw model text for state changes — only validated structured fields mutate
  game state.

### 4.4 TransportSystem
- Data-driven: a `TransportNetwork` of `Stop`s, `Route`s (ordered waypoints), and
  `Vehicle`s with a `mode` (`XE_OM | CYCLO | BUS | METRO | E_BUS`).
- Boarding flow: at a stop → choose destination from reachable stops → fare check against
  inventory currency → enter `RIDING` → animate vehicle along route waypoints with the
  camera attached → arrive → return to `WALKING`.
- First implemented mode (P0): **xe ôm** or **bus** (single route, two+ stops).

### 4.5 QuestSystem & Inventory
- `QuestLog`: active/completed quests keyed by id; each has objective + reward.
- Objective types (keep small): `TALK_TO(npcId)`, `GO_TO(locationId)`,
  `DELIVER(itemId, npcId)`, `COLLECT(itemId, count)`.
- `Inventory`: currency balance + item counts. Rewards credit here; fares debit.
- Emits events the HUD subscribes to.

### 4.6 WorldState & DemoSeed
- Single source of truth the agent calls read from (player location, inventory, quest
  statuses, time-of-day).
- `DemoSeed` (Requirement 10.1): a deterministic scenario that guarantees the demo path
  spawn → meet NPC → AI quest → ride transport → complete → reward.

## 5. Backend AI proxy

A thin, stateless-per-request **Node + Hono** service, shipped as a **Docker image** and run
on a small host (not serverless — the proxy streams model replies over long-lived upstream
connections, which suits a container). The client is a separate static origin on Cloudflare
(see §10/§11), so the proxy enables **credentialed CORS** for that origin. Hono exposes
`export type AppType` for the shared `hc<>` client. Endpoints:

| Endpoint | Input | Output | Meta model |
|----------|-------|--------|-----------|
| `POST /npc/chat` | personaId, worldState, history, playerText | `{ reply, mayOfferQuest }` | Muse Spark |
| `POST /npc/quest` | personaId, worldState, context | validated `Quest` JSON | Muse Spark (JSON mode / tool-call) |
| `POST /npc/verify` | quest, worldState, playerClaim | `{ status, reward, line }` | Muse Spark |
| `POST /voice/stt` | audio blob | `{ transcript }` | Muse Transcribe (opt) |
| `GET /health` | — | `{ ok, model }` | — |

Cross-cutting components:
- **PromptBuilder** — composes system prompt (persona + world rules + output contract) +
  user turn. One template per operation.
- **OutputValidator** — parses/repairs JSON, validates against Zod schemas; on failure,
  returns a safe fallback and logs it.
- **Rate/CostGuard** — per-session token/call ceiling to protect the $150 credit; short-circuits
  to fallback when exceeded.
- **Cache / pre-warm** — memoizes common/opening lines and the demo-seed responses
  (Requirement 10.2) keyed by a hash of the prompt inputs.
- **Model selector** — config flag switches between hosted Meta Model API and an open-weight
  endpoint (Muse Spark Open) for the open-weight bonus (Requirement 9.5).

### Structured-output contract (example `Quest`)

```jsonc
{
  "id": "q_ba_market_pho",
  "title": "A Bowl Worth Finding",
  "description": "Auntie Hoa at the market swears the best phở is three stalls down...",
  "objective": { "type": "DELIVER", "itemId": "pho_bowl", "npcId": "npc_hoa" },
  "reward": { "currency": 50, "itemId": null, "reputation": 1 },
  "giverNpcId": "npc_hoa"
}
```

The model is instructed (system prompt + JSON schema / function-calling) to emit exactly this
shape. `OutputValidator` rejects anything else and the client only ever consumes validated
objects.

## 6. NPC persona model

```ts
interface NpcPersona {
  id: string;
  name: string;              // e.g., "Cô Hoa"
  role: string;              // "market food vendor"
  personality: string;       // "warm, chatty, proud of her phở"
  speakingStyle: string;     // "mixes Vietnamese phrases, friendly"
  knowledge: string[];       // facts this NPC may reference
  questThemes: string[];     // what kinds of quests they tend to give
  location: string;          // spawn/location id
}
```

Seed NPCs (P0: 1; P1: 3–4):
- **Cô Hoa** — Bến Thành-style market food vendor (food-delivery / fetch quests).
- **Anh Tâm** — xe ôm driver (transport/escort quests, teaches the transport system).
- **Chị Linh** — student near the cathedral/park (photo / exploration quests).
- **Ông Ba** — cyclo veteran (storytelling, landmark-tour quests).

## 7. Platform / input abstraction (one codebase, two targets)

```ts
interface InputProvider {
  getMoveVector(): Vec2;
  getLookDelta(): Vec2;      // desktop mouse / VR head is implicit
  consumeInteract(): boolean;
  getTextInput?(): string;   // desktop text entry
  startVoiceCapture?(): void;// VR / voice path
}
// DesktopInput implements keyboard/mouse; XRInput implements controllers/hands + voice.
```

Rendering/UI abstraction:
- **Desktop:** 2D DOM/canvas HUD overlay, text input box for dialogue.
- **VR:** world-space panels anchored near the NPC; ray-selectable prompt menu and/or voice
  input; snap-turn and teleport for comfort.

Mode is detected at startup (`navigator.xr.isSessionSupported('immersive-vr')`) with a manual
toggle for testing.

## 8. Performance plan (Requirement 1.4 / 7.4)

- Low-poly assets, texture atlases, merged static geometry to cut draw calls.
- Baked lighting where possible; few real-time lights.
- LODs / frustum + distance culling; cap ambient NPC/traffic count.
- VR target ≥ 72 FPS: foveation (if available), half-res UI panels, no heavy post-processing.
- AI latency hidden behind thinking animations + cached opening lines + streaming replies.

## 9. Resilience & demo mode (Requirement 10)

- **Health poll** of `/health` at boot; show an unobtrusive "AI offline — fallback mode"
  state if down.
- **Fallback lines** per persona and per operation (chat/quest/verify) baked into the client.
- **Demo seed:** one keypress loads the scripted-but-live demo scenario; responses for that
  path are pre-warmed/cached so latency is near-zero on stage.
- **Dev logging** of every AI request/response for debugging and demo-video narration.

## 10. Repository layout (Bun monorepo)

```
saigon-tour/                 # Bun workspace root (bun@1.4.2, isolated linker, bun.lock)
├─ spec/                     # requirements.md, design.md, tasks.md
├─ docs/                     # meta-hackathon-details.md, demo-script.md, credits/licenses
├─ package.json              # workspaces: apps/*, packages/*; root scripts (dev, build, check)
├─ bun.lock
├─ biome.jsonc               # Biome 2.5.x lint + format config
├─ tsconfig.base.json        # shared compiler options only (no include/files)
├─ tsconfig.json             # solution file: { files: [], references: [...every project] }
├─ apps/
│  ├─ client/                # Vite + React + TS (R3F game: shared core + platform layers)
│  │  ├─ tsconfig.json       # composite project (includes its own src + tests)
│  │  └─ src/
│  │     ├─ core/            # PlayerController, NpcAgentClient, TransportSystem, QuestSystem…
│  │     ├─ platform/        # DesktopInput, XRInput, desktop/VR UI
│  │     ├─ world/           # scene assembly (R3F components), NPC/transport/demo-seed data
│  │     ├─ state/           # TanStack Store stores (world, quests, inventory, dialogue)
│  │     └─ net/             # backend client (TanStack Query + hc<AppType>)
│  └─ server/                # Node + Hono AI proxy (TS), shipped as a Docker image
│     ├─ tsconfig.json       # composite project
│     ├─ Dockerfile          # builds the proxy image for the small host
│     └─ src/
│        ├─ routes/          # /npc/chat, /npc/quest, /npc/verify, /voice/stt, /health
│        ├─ meta/            # Meta Model API client + model selector
│        └─ agent/           # PromptBuilder, OutputValidator, Rate/CostGuard, Cache
├─ packages/
│  └─ shared/                # zod v4 schemas + TS types shared by client & server
│     ├─ tsconfig.json       # composite project
│     └─ src/                # Quest, NpcPersona, WorldState, API request/response contracts
├─ assets/                   # GLTF models, textures (with LICENSES)
├─ wrangler.jsonc            # Cloudflare asset-only Worker: serves the built client (static)
└─ README.md                 # public, with build/run + clear "built during hackathon" notes
```

The client build output is deployed to a **Cloudflare Worker asset layer** (static only — no
worker code routes game traffic). The backend proxy is **not** on Cloudflare: it builds to a
Docker image and runs on a small host (§5, §11 D5).

The `packages/shared` workspace is the single source of truth for the structured-output
contracts (zod schemas → inferred TS types), imported by both `apps/client` and `apps/server`
so the agent payloads can never drift between the two.

## 11. Open decisions

- **D1. [RESOLVED]** Stack = Web + WebXR, three.js + React Three Fiber + @react-three/xr,
  full TypeScript ^7, **Bun** monorepo, solo developer. Backend = Node + Hono shipped as a
  **Docker image** to a small host; client = Vite static build served by a **Cloudflare
  Worker asset layer**. (See §2, §5, §10.)
- **D2.** Exact Meta model IDs for dialogue vs structured output (confirm from the model list;
  note Baseten's `muse-spark-open-1026` quirk if using open weights). _Credits claimed; pin
  the IDs during the Task 2 smoke test._
- **D3.** Whether verify uses the model or a deterministic world-state check (cost vs
  flexibility) — likely deterministic for `GO_TO`/`COLLECT`, model-assisted for fuzzy claims.
- **D4.** Voice (Requirement 8) in P2 scope only if VR lands with time to spare.
- **D5. [RESOLVED]** Backend ships as a Docker image to a small host behind a TLS-terminating
  reverse proxy (e.g. Caddy/Traefik auto-HTTPS), giving the HTTPS origin WebXR needs on Quest.
  The client is a static Cloudflare Worker asset deployment on its own HTTPS origin; the two
  origins talk over credentialed CORS. Pin the backend's public hostname before the Task 2
  smoke test.
```
