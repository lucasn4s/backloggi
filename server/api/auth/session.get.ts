import { lucia } from '~/services/auth'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, lucia.sessionCookieName)
  if (!sessionId) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const { session, user } = await lucia.validateSession(sessionId)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  return { session, user }
})