import { lucia, googleAuth } from '~/services/auth'
import { db } from '~/services/db'
import { users } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { generateIdFromEntropySize } from 'lucia'
import { googleOAuthQuerySchema, googleUserSchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { state, code } = googleOAuthQuerySchema.parse(query)

  const storedState = getCookie(event, 'google_oauth_state')
  const codeVerifier = getCookie(event, 'google_code_verifier')

  if (!storedState || state !== storedState || !codeVerifier) {
    throw createError({ statusCode: 400, message: 'Invalid OAuth state. Please try logging in again.' })
  }

  deleteCookie(event, 'google_oauth_state', { path: '/' })
  deleteCookie(event, 'google_code_verifier', { path: '/' })

  try {
    const tokens = await googleAuth.validateAuthorizationCode(code, codeVerifier)
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    })
    const rawGoogleUser = await response.json()
    const googleUser = googleUserSchema.parse(rawGoogleUser)

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email),
    })

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)
      setCookie(event, sessionCookie.name, sessionCookie.value, {
        path: '/',
        ...sessionCookie.attributes,
      })
      return sendRedirect(event, '/dashboard')
    }

    const userId = generateIdFromEntropySize(10)
    await db.insert(users).values({
      id: userId,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
    })

    const session = await lucia.createSession(userId, {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    setCookie(event, sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes,
    })

    return sendRedirect(event, '/dashboard')
  } catch (e) {
    console.error('Auth callback error:', e)
    throw createError({ statusCode: 500, message: 'Authentication failed. Please try again.' })
  }
})
