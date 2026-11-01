# Client

- Never touch `localStorage`/`sessionStorage` directly. Persist client data through TanStack Query `persistQueryClient` (`src/shared/api/query.ts`, async storage persister).
- "Clear saved data" in the pause menu removes the persisted query cache and reloads as a new guest.
