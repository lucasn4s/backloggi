import { lucia } from '~/services/auth'

export async function requireAuth(event: H3Event) {
  const sessionId = getCookie(event, lucia.sessionCookieName)
  if (!sessionId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { session, user } = await lucia.validateSession(sessionId)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  return { session, user }
}