# Client

- Never touch `localStorage`/`sessionStorage` directly. Persist client data through TanStack Query `persistQueryClient` (`src/shared/api/query.ts`, async storage persister).
- "Clear saved data" in the pause menu removes the persisted query cache and reloads as a new guest.
- UI text goes through Paraglide (`messages/{en,vi}.json`, compiled to `src/paraglide/`, gitignored). Import `m` from `@/shared/i18n`. Never call `m.*()` at module scope; wrap lists in functions (see `placeName`, `itemLabel`).
- Language persists in the query cache under `['settings']`, never `localStorage`. "Clear saved data" resets it to the browser language. Canvas/XR text calls `useLocale()` so textures redraw.
- `messages/*.json` are data and exempt from the ≤300-line rule. Proper nouns (NPC names, street signs, market item labels) stay untranslated.
