import type { Session, User } from 'lucia'

const SESSION_COOKIE_NAME = 'auth_session'

export function useAuth() {
  const session = useState<Session | null>('auth-session', () => null)
  const user = useState<User | null>('auth-user', () => null)
  const sessionExpired = useState<boolean>('auth-session-expired', () => false)

  const isAuthenticated = computed(() => !!session.value)

  async function fetchSession(): Promise<boolean> {
    const hadCookie = !!useCookie(SESSION_COOKIE_NAME).value

    try {
      const data = await $fetch<{ session: Session; user: User }>('/api/auth/session')
      session.value = data.session
      user.value = data.user
      sessionExpired.value = false
      return false
    } catch {
      session.value = null
      user.value = null
      sessionExpired.value = hadCookie
      return hadCookie
    }
  }

  function clearSessionExpired() {
    sessionExpired.value = false
  }

  async function signOut() {
    await $fetch('/auth/logout', { method: 'POST' })
    session.value = null
    user.value = null
    await navigateTo('/')
  }

  return { session, user, isAuthenticated, sessionExpired, fetchSession, clearSessionExpired, signOut }
}
