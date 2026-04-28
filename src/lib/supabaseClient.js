const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

const STORAGE_KEY = 'flowdesk-supabase-auth-session'
const listeners = new Set()

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function normalizeUrl(url) {
  return String(url || '').replace(/\/$/, '')
}

function getAuthEndpoint(path) {
  return `${normalizeUrl(supabaseUrl)}/auth/v1/${path.replace(/^\//, '')}`
}

function getHeaders(accessToken) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
    'Content-Type': 'application/json',
  }
}

function readSession() {
  try {
    const storage = getStorage()
    if (!storage) return null
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(session) {
  const storage = getStorage()
  if (!storage) return
  if (!session) storage.removeItem(STORAGE_KEY)
  else storage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function toSession(payload) {
  if (!payload?.access_token) return null
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = Number(payload.expires_in || 3600)
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: expiresIn,
    expires_at: payload.expires_at || now + expiresIn,
    token_type: payload.token_type || 'bearer',
    user: payload.user || null,
  }
}

async function requestAuth(path, body, accessToken) {
  const response = await fetch(getAuthEndpoint(path), {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(body || {}),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { data: null, error: { message: payload?.msg || payload?.message || '登入服務發生錯誤' } }
  }
  return { data: payload, error: null }
}

function notify(event, session) {
  listeners.forEach((callback) => {
    try {
      callback(event, session)
    } catch {
      // keep other listeners alive
    }
  })
}

async function refreshSession(session) {
  if (!session?.refresh_token) return null
  const { data, error } = await requestAuth('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
  if (error) return null
  const nextSession = toSession(data)
  writeSession(nextSession)
  notify('TOKEN_REFRESHED', nextSession)
  return nextSession
}

export const supabase = hasSupabaseConfig
  ? {
      auth: {
        async getSession() {
          const session = readSession()
          if (!session) return { data: { session: null }, error: null }

          const now = Math.floor(Date.now() / 1000)
          if (session.expires_at && session.expires_at - 60 <= now) {
            const refreshed = await refreshSession(session)
            if (!refreshed) {
              writeSession(null)
              return { data: { session: null }, error: null }
            }
            return { data: { session: refreshed }, error: null }
          }

          return { data: { session }, error: null }
        },

        onAuthStateChange(callback) {
          listeners.add(callback)
          return {
            data: {
              subscription: {
                unsubscribe() {
                  listeners.delete(callback)
                },
              },
            },
          }
        },

        async signInWithPassword({ email, password }) {
          const { data, error } = await requestAuth('token?grant_type=password', { email, password })
          if (error) return { data: null, error }

          const session = toSession(data)
          writeSession(session)
          notify('SIGNED_IN', session)
          return { data: { session, user: session?.user || null }, error: null }
        },

        async signOut() {
          const session = readSession()
          if (session?.access_token) {
            await requestAuth('logout', {}, session.access_token).catch(() => null)
          }
          writeSession(null)
          notify('SIGNED_OUT', null)
          return { error: null }
        },
      },
    }
  : null
