import { lucia } from '~/services/auth'

function clearSessionCookie(event: Parameters<typeof defineEventHandler>[0] extends (e: infer E) => unknown ? E : never) {
  const blank = lucia.createBlankSessionCookie()
  setCookie(event, blank.name, '', {
    path: '/',
    ...blank.attributes,
    maxAge: 0,
  })
}

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, lucia.sessionCookieName)

  if (!sessionId) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const { session, user } = await lucia.validateSession(sessionId)

  if (!session) {
    clearSessionCookie(event)
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  }
})
