import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

export const PERSIST_KEY = 'saigon-tour.query-cache'
const PERSISTED: readonly string[] = ['session', 'settings']

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})
// Defaults match by key prefix, so each persisted key needs its own entry.
for (const key of PERSISTED)
  queryClient.setQueryDefaults([key], {
    gcTime: Number.POSITIVE_INFINITY,
    staleTime: Number.POSITIVE_INFINITY,
  })

/** Browser storage, resolved per call; storage-disabled browsers play unsaved. */
const storage = {
  getItem: (key: string) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(key, value)
    } catch {}
  },
  removeItem: (key: string) => {
    try {
      globalThis.localStorage?.removeItem(key)
    } catch {}
  },
}
const persister = createAsyncStoragePersister({
  storage,
  key: PERSIST_KEY,
  throttleTime: 0,
})
const [stopPersisting, restored] = persistQueryClient({
  queryClient,
  persister,
  maxAge: Number.POSITIVE_INFINITY,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      PERSISTED.includes(String(query.queryKey[0])),
    shouldDehydrateMutation: () => false,
  },
})

/** Resolves once the persisted cache is back in the query client. */
export const queryCacheRestored = restored.catch(() => {})

/** Forget everything this device saved; the next load starts a new guest. */
export async function clearPersistedQueries() {
  stopPersisting()
  queryClient.clear()
  await persister.removeClient()
}
