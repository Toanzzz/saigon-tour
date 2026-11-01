# Saigon Tour

- Multiple agents may work in this repository at the same time. If you encounter unknown changes, stop and ask the user for coordination before continuing.
- Bun 1.4.4, isolated workspaces. TypeScript 7/tsgo, Biome 2.6.x.
- Client: React Three Fiber, Three.js, Rapier, TanStack Store/Query, WebXR.
- Server: Node + Hono in a Docker image. Shared contracts: zod 4, raw TypeScript package.
- Cloudflare serves static client assets. AI traffic goes directly to the backend origin.
- Keep secrets in server environment variables. Never copy `.env` into builds or images.
- Reuse licensed assets in `assets/`; runtime copies belong in `apps/client/public`.
- `bun run dev`: client 58000, server 58001, Postgres 58002. This repository owns port block 58000–58009.
- `bun run prepare:assets` creates runtime models; preserve the source models.
- Feature modules expose public APIs through `index.ts`; imports flow toward shared contracts.
- Each package owns its composite TypeScript project; no cross-package relative imports.
- Client state lives in TanStack Stores; see `apps/client/AGENTS.md`.
- Target ≤300 lines per source file.
- Definition of Done: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`.
- UI verification uses headless Playwright with real controls, desktop and 390px mobile flows. Launching Chromium is killed inside the sandbox (EPERM/SIGABRT); run the Playwright script unsandboxed (escalated).
- Update `docs/game-progress.md` while working. Record observed results in `docs/final-evidence.md`.
- Commit each validated pass. Use conventional commit style. Never add AI attribution to commits, docs, or code.
- Ask user to start or restart local dev server, instead of running one.
