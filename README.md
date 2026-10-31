# Sài Gòn · A little journey

A stylized neighborhood exploration game for the Meta Global AI Developer Hackathon.
Meet Cô Hoa at Bến Thành, help a neighbor, take a ride, and collect a little piece of the city.

## Run

```sh
bun install
cp .env.example .env
# Set META_MUSE_API_KEY in .env for live NPCs.
bun run dev
```

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
Cloudflare asset-only deployment. Set `VITE_API_BASE_URL` to the separate HTTPS API
origin at build time. Set `CLIENT_BASE_PATH` when serving from a subdirectory.

The Node/Hono backend ships as a Docker image:

```sh
docker build -f apps/server/Dockerfile -t saigon-tour-api .
docker run --env-file .env -p 58001:58001 saigon-tour-api
```

Terminate TLS at the host proxy and set `CORS_ORIGINS` to the client origin.
Credentials belong only in the backend runtime environment.

## Project

- [Design and controls](docs/game-design.md)
- [Meta integration](docs/meta-api.md)
- [Architecture](docs/architecture.md)
- [Progress and open checks](docs/game-progress.md)
- [Requirements](docs/requirements.md) · [Implementation plan](docs/tasks.md)

Project period: October 27–November 4, 2026. Submission deadline: November 4, 9 PM ET.
The repository includes supplied asset packs and a custom market source model; their
provenance is recorded separately from the game's implementation.
