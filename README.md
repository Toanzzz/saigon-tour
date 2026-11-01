# Sài Gòn · A little journey

A stylized neighborhood exploration game for the Meta Global AI Developer Hackathon.
Meet Cô Hoa at Bến Thành, help a neighbor, take a ride, and collect a little piece of the city.

## Run

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

**Controls:** WASD or arrows to move, Shift to run, drag to look, E to interact,
J for your journal, M for the map, Escape to close or pause. Phones use the movement
pad and interaction button.

## Develop

```sh
bun run check
bun run check:types
bun run build
bun run test
bun run preview
```

`bun run prepare:assets` rebuilds the runtime asset subset from `assets/`.
The market, city, characters, vehicles, food, and vegetation reuse the supplied models.
Source models stay editable. Runtime models embed their textures, merge static market
geometry, and preserve character animation clips. See [asset licenses](assets/LICENSES.md).

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
`edge` network as `saigon-api:58001`, behind Caddy at `https://saigon-api.toan.io`.

`scripts/setup-deploy.sh [--host t-oracle] [--force]` sets the credentials below once and is
safe to re-run. It prints the remaining manual steps: the Caddy block, DNS, and the Meta
redirect URI.

- GitHub secrets: `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_HOST`, `DEPLOY_USER`,
  optional `DEPLOY_DIR` (default `apps/saigon-tour` under `$HOME`), `CLOUDFLARE_API_TOKEN`
  (Edit Cloudflare Workers), `CLOUDFLARE_ACCOUNT_ID`.
- GitHub variable: `API_URL` (`https://saigon-api.toan.io`).
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

## Project

- [Design and controls](docs/game-design.md)
- [Meta integration](docs/meta-api.md)
- [Architecture](docs/architecture.md)
- [Progress and open checks](docs/game-progress.md)
- [Requirements](docs/requirements.md) · [Implementation plan](docs/tasks.md)

Project period: October 27–November 4, 2026. Submission deadline: November 4, 9 PM ET.
The repository includes supplied asset packs and a custom market source model; their
provenance is recorded separately from the game's implementation.
