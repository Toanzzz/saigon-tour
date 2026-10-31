export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
export const GUEST_TOKEN_KEY = 'saigon-tour.guest-token'

let token: string | null = null

function readToken() {
  try {
    return localStorage.getItem(GUEST_TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(value: string | null) {
  token = value
  try {
    if (value) localStorage.setItem(GUEST_TOKEN_KEY, value)
    else localStorage.removeItem(GUEST_TOKEN_KEY)
  } catch {
    // Browsers with storage disabled can still play for this session.
  }
}

export function guestToken() {
  return token ?? readToken()
}

export function authorizationHeaders(): Record<string, string> {
  const value = guestToken()
  return value ? { Authorization: `Bearer ${value}` } : {}
}
