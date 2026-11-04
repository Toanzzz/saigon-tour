# Development & operations

Technical reference for running, building, deploying, and operating **Sài Gòn · A little journey**.
For the player-facing overview, see the [README](../README.md).

## Stack

- **Runtime:** Bun 1.4.4, isolated workspaces. TypeScript 7 / tsgo, Biome 2.6.x.
- **Client:** React Three Fiber, Three.js, Rapier, TanStack Store/Query, WebXR.
- **Server:** Node + Hono in a Docker image.
- **Shared contracts:** zod 4, a raw TypeScript package.
- **Hosting:** Cloudflare serves static client assets. AI traffic goes directly to the backend origin.

## Run locally

```sh
bun install
bun run dev
```

Runs zero-config against a local Postgres with sensible built-in defaults. For live
NPCs, set `META_MUSE_API_KEY` (Bun auto-loads a gitignored `.env`); without it the game
runs with an explicitly labeled offline guide. In production, startup fails fast if
`DATABASE_URL` or `META_MUSE_API_KEY` is missing.

Open `http://127.0.0.1:58000`. The API runs on port 58001. The game remains playable with
an explicitly labeled offline guide when the model or API cannot be reached.

`bun run dev` serves the client on 58000, the server on 58001, and Postgres on 58002.
This repository owns the port block 58000–58009.

## Develop

```sh
bun run check
bun run check:types
bun run build
bun run test
bun run preview
```

**Definition of Done:** `bun run check` → `bun run check:types` → `bun run build` → `bun run test`.

`bun run prepare:assets` rebuilds the runtime asset subset from `assets/`.
The market, city, characters, vehicles, food, and vegetation reuse the supplied models.
Source models stay editable. Runtime models embed their textures, merge static market
geometry, and preserve character animation clips. See [asset licenses](../assets/LICENSES.md).

### Conventions

- Feature modules expose public APIs through `index.ts`; imports flow toward shared contracts.
- Each package owns its composite TypeScript project; no cross-package relative imports.
- NPC content lives in `packages/npc-<id>`; register it in `packages/shared/src/npcs/registry.ts`.
- Client state lives in TanStack Stores; see [`apps/client/AGENTS.md`](../apps/client/AGENTS.md).
- Target ≤300 lines per source file.
- Reuse licensed assets in `assets/`; runtime copies belong in `apps/client/public`.
- Keep secrets in server environment variables. Never copy `.env` into builds or images.

## Hosting

The client is a static Vite build in `apps/client/dist`. `wrangler.jsonc` configures a
Cloudflare asset-only Worker on `workers.dev`. Set `VITE_API_BASE_URL` to the separate HTTPS
API origin at build time. Set `CLIENT_BASE_PATH` when serving from a subdirectory.

The Node/Hono backend ships as a Docker image:

```sh
docker build -f apps/server/Dockerfile -t saigon-tour-api .
docker run --env-file .env -p 58001:58001 saigon-tour-api
```

### CI deploy

`.github/workflows/deploy.yml` runs on every push to `main` (pull requests run `verify` only):

1. `verify`: `bun run check` → `check:types` → `build` → `test`.
2. `image`: builds `ghcr.io/toanzzz/saigon-tour-api:<sha>` and `:latest` for linux/arm64.
3. `api`: copies `compose.prod.yml` to the host and runs `scripts/deploy-remote.sh` over SSH,
   which pulls, recreates the single `api` container, and waits for `/health`. Live Colyseus
   rooms reset on deploy; saved progress persists. Migrations run at API startup.
4. `client`: builds with `VITE_API_BASE_URL=${API_URL}` and runs `wrangler deploy`.

`compose.prod.yml` runs Postgres 18 (loopback `127.0.0.1:58002`) and the API on the shared
`edge` network as `saigon-api:58001`, behind Caddy at `https://saigon-tour-api.toan.io`.

`bun run credentials [--host t-oracle] [--force]` walks through the credentials below and is
safe to re-run. It infers the repository (`gh`), host (`ssh -G`), and Cloudflare account
(`wrangler whoami`), prints a pre-filled Cloudflare token template link (Workers Scripts:
Edit), verifies the token and `META_MUSE_API_KEY` before storing them, and ends with the
remaining manual steps: the Caddy block, DNS, and the Meta redirect URI.

- GitHub secrets: `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_HOST`, `DEPLOY_USER`,
  optional `DEPLOY_DIR` (default `apps/saigon-tour` under `$HOME`), `CLOUDFLARE_API_TOKEN`
  (Workers Scripts: Edit), `CLOUDFLARE_ACCOUNT_ID`.
- GitHub variable: `API_URL` (`https://saigon-tour-api.toan.io`).
- Host `${DEPLOY_DIR}/.env` (mode 600): `POSTGRES_PASSWORD`,
  `DATABASE_URL=postgres://saigon:<pw>@postgres:5432/saigon`, `META_MUSE_API_KEY`,
  `BETTER_AUTH_SECRET`, `PUBLIC_API_URL`, `CLIENT_URL`, `CORS_ORIGINS`; optional
  `META_CLIENT_ID`/`META_CLIENT_SECRET`, `DIRECTOR_MODE`.
- The host pulls from GHCR: make the `saigon-tour-api` package public or `docker login ghcr.io`.

### Identity

Terminate TLS at the host proxy and set `CORS_ORIGINS` to the client origin.
Credentials belong only in the backend runtime environment.

Identity uses Better Auth. Set `BETTER_AUTH_SECRET` (32+ characters, required in
production), `PUBLIC_API_URL` (the API origin the browser uses), and `CLIENT_URL`.
Meta login is enabled when both `META_CLIENT_ID` and `META_CLIENT_SECRET` are set; register
`${PUBLIC_API_URL}/auth/callback/facebook` as the Facebook Login redirect URI. See
`apps/server/.env.example`. `bun run --filter @saigon/server auth:generate` regenerates the
auth schema from the plugin list; never edit `src/shared/db/auth-schema.ts` by hand.

## How Meta models are used

Meta Muse Spark powers the live NPC agents through the server's Mastra tool loop.
Agents can propose or drop quests, adjust friendship, read world context, and remember
player facts. Shared rules validate quest steps and rewards; credentials remain server-side.
The live City Director uses the same configured model to draft a daily plan from local
news and the shared city state.

The default model is `muse-spark-1.3-contributor` at Meta's API. The endpoint and model
are configurable; the server health response identifies the active configuration.
The `?demo` route uses authored quest offers for a repeatable gag → twist sequence.
Those deterministic offers do not call the model; the recording includes a separate
live interaction. Offline or failed calls show an offline guide and preserve text play.
Optional voice input records a short message, transcribes it with Muse Voice Transcribe,
and sends the text through the NPC agent. It is disabled until the server sets
`META_TRANSCRIBE_MODEL=muse-voice-transcribe-1.0`; text remains usable on failure.
Production microphone capture, transcription, and NPC chat are verified at desktop and mobile sizes.

## Hackathon contributions

Hackathon development window: October 27–November 4, 2026. This repository contains the
gameplay, NPC agents and tool validation, City Director, shared rooms, bilingual interface,
WebXR integration, and deployment work developed for the event. Repository history begins
October 28, 2026, in the contributor's UTC+7 timezone.

Contributor: **Toàn** ([toanzzz](https://github.com/toanzzz)), the sole author recorded in
the repository history. Existing libraries and supplied asset packs retain their separate
licenses; asset sources and unresolved provenance are listed in [Asset provenance](../assets/LICENSES.md).

Submission deadline: **November 4, 2026, 9:00 PM EST** /
**November 5, 2026, 9:00 AM ICT**. The video and final submission are pending.

## Project reference

- [Design and controls](game-design.md)
- [Meta integration](meta-api.md)
- [Architecture](architecture.md)
- [Progress and open checks](game-progress.md)
- [Requirements](requirements.md) · [Implementation plan](tasks.md)
- [Asset provenance](../assets/LICENSES.md) · [Third-party asset notices](../apps/client/public/THIRD_PARTY_NOTICES.txt)

Original source code is licensed under [Apache-2.0](../LICENSE), copyright 2026 Toàn.
Bundled assets and dependencies retain their separate licenses; see the provenance inventory.
