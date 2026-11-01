# Client

- Never touch `localStorage`/`sessionStorage` directly. Persist client data through TanStack Query `persistQueryClient` (`src/shared/api/query.ts`, async storage persister).
- "Clear saved data" in the pause menu removes the persisted query cache and reloads as a new guest.
- UI text goes through Paraglide (`messages/{en,vi}.json`, compiled to `src/paraglide/`, gitignored). Import `m` from `@/shared/i18n`. Never call `m.*()` at module scope; wrap lists in functions (see `placeName`, `itemLabel`).
- Language persists in the query cache under `['settings']`, never `localStorage`. "Clear saved data" resets it to the browser language. Canvas/XR text calls `useLocale()` so textures redraw.
- `messages/*.json` are data and exempt from the ≤300-line rule. Proper nouns (NPC names, street signs, market item labels) stay untranslated.

## State

- TanStack Store owns reactive state and effects; Query owns data and mutations; components are presentation.
- Every piece of reactive state lives in a Store (module-level), not component `useState` (React error-boundary class state and the wardrobe SSR `mounted` guard are the only exceptions). Each store exports a `resetX()`; journey-scoped ones reset in `restart()` (`src/app/actions.ts`), all of them in `test/setup.ts` `beforeEach`.
- Pending/busy flags come from `useMutation` `isPending`, not a `useState` boolean.
- New stores live in their own files (≤300 lines), not in `src/shared/state/game.ts`. Keep the existing `Store` + `update()`/`setState` API; do not migrate to the 0.11 actions-factory/atoms.
- Write a store only on change (`shallow` from `@tanstack/store` for compares); frame tickers must not spam subscribers. Keep per-frame simulation data (motion, input, presence sample Maps) mutable, read in `useFrame`; only move React-visible derivations into stores, written by one throttled ticker.
- Read with `useSelector`, not `useStore`. Narrow whole-store reads to the fields a component uses (`{ compare: shallow }`).
- `subscribe` passes only the new value (0.11); track the previous value yourself when a transition needs it. Seed UI stores on game transitions once in `installUiResets()` (`src/shared/state/ui-resets.ts`), not on every mount.
