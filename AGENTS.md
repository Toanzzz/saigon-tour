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

## Client state

- TanStack Store owns reactive state and effects; Query owns data and mutations; components are presentation.
- Every piece of reactive state lives in a Store (module-level), not component `useState` (React error-boundary class state and the wardrobe SSR `mounted` guard are the only exceptions). Each store exports a `resetX()`; journey-scoped ones reset in `restart()` (`app/actions.ts`), all of them in `test/setup.ts` `beforeEach`.
- Pending/busy flags come from `useMutation` `isPending`, not a `useState` boolean.
- New stores live in their own files (≤300 lines), not in `shared/state/game.ts`. Keep the existing `Store` + `update()`/`setState` API; do not migrate to the 0.11 actions-factory/atoms.
- Write a store only on change (`shallow` from `@tanstack/store` for compares); frame tickers must not spam subscribers. Keep per-frame simulation data (motion, input, presence sample Maps) mutable, read in `useFrame`; only move React-visible derivations into stores, written by one throttled ticker.
- Read with `useSelector`, not `useStore`. Narrow whole-store reads to the fields a component uses (`{ compare: shallow }`).
- `subscribe` passes only the new value (0.11); track the previous value yourself when a transition needs it. Seed UI stores on game transitions once in `installUiResets()`, not on every mount.
- Target ≤300 lines per source file.
- Definition of Done: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`.
- UI verification uses headless Playwright with real controls, desktop and 390px mobile flows. Launching Chromium is killed inside the sandbox (EPERM/SIGABRT); run the Playwright script unsandboxed (escalated).
- Update `docs/game-progress.md` while working. Record observed results in `docs/final-evidence.md`.
- Commit each validated pass. Use conventional commit style. Never add AI attribution to commits, docs, or code.
- Ask user to start or restart local dev server, instead of running one.
