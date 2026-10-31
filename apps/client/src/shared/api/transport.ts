export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
export const SESSION_TOKEN_KEY = 'saigon-tour.session-token'

let token: string | null = null

function readToken() {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(value: string | null) {
  token = value
  try {
    if (value) localStorage.setItem(SESSION_TOKEN_KEY, value)
    else localStorage.removeItem(SESSION_TOKEN_KEY)
  } catch {
    // Browsers with storage disabled can still play for this session.
  }
}

/** The Better Auth session token, sent as a bearer credential. */
export function sessionToken() {
  return token ?? readToken()
}

export function authorizationHeaders(): Record<string, string> {
  const value = sessionToken()
  return value ? { Authorization: `Bearer ${value}` } : {}
}

export const apiUrl = (path: string) => `${API_BASE.replace(/\/$/, '')}${path}`
