import type { Session, User } from 'lucia'

export function useAuth() {
  const session = useState<Session | null>('auth-session', () => null)
  const user = useState<User | null>('auth-user', () => null)

  const isAuthenticated = computed(() => !!session.value)

  async function fetchSession() {
    try {
      const data = await $fetch<{ session: Session; user: User }>('/api/auth/session')
      session.value = data.session
      user.value = data.user
    } catch {
      session.value = null
      user.value = null
    }
  }

  async function signOut() {
    await $fetch('/auth/logout', { method: 'POST' })
    session.value = null
    user.value = null
    await navigateTo('/')
  }

  return { session, user, isAuthenticated, fetchSession, signOut }
}