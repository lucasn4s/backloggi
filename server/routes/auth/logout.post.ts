import { lucia } from '~/services/auth'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, lucia.sessionCookieName)

  if (sessionId) {
    const { session } = await lucia.validateSession(sessionId)
    if (session) {
      await lucia.invalidateSession(session.id)
    }
  }

  const blankCookie = lucia.createBlankSessionCookie()
  setCookie(event, blankCookie.name, blankCookie.value, {
    path: '/',
    ...blankCookie.attributes,
  })

  return sendRedirect(event, '/')
})
