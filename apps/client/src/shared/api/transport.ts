import { queryClient } from './query'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
export const SESSION_TOKEN_QUERY = ['session', 'token'] as const

/** Store the Better Auth token in the persisted query cache. */
export function saveToken(value: string | null) {
  if (value) queryClient.setQueryData(SESSION_TOKEN_QUERY, value)
  else queryClient.removeQueries({ queryKey: SESSION_TOKEN_QUERY })
}

/** The Better Auth session token, sent as a bearer credential. */
export function sessionToken() {
  return queryClient.getQueryData<string>(SESSION_TOKEN_QUERY) ?? null
}

export function authorizationHeaders(): Record<string, string> {
  const value = sessionToken()
  return value ? { Authorization: `Bearer ${value}` } : {}
}

export const apiUrl = (path: string) => `${API_BASE.replace(/\/$/, '')}${path}`
