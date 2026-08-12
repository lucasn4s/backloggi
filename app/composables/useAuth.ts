import type { User } from 'lucia'

const SESSION_COOKIE_NAME = 'auth_session'

export function useAuth() {
  const user = useState<User | null>('auth-user', () => null)
  const sessionExpired = useState<boolean>('auth-session-expired', () => false)

  const isAuthenticated = computed(() => !!user.value)

  async function fetchSession(): Promise<boolean> {
    const hadCookie = !!useCookie(SESSION_COOKIE_NAME).value

    try {
      const data = await $fetch<{ user: User }>('/api/auth/session')
      user.value = data.user
      sessionExpired.value = false
      return false
    } catch {
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
    user.value = null
    await navigateTo('/')
  }

  return { user, isAuthenticated, sessionExpired, fetchSession, clearSessionExpired, signOut }
}
