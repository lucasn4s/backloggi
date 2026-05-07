import { googleAuth } from '~/services/auth'
import { generateCodeVerifier, generateState } from 'arctic'

export default defineEventHandler(async (event) => {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()

  const url = googleAuth.createAuthorizationURL(state, codeVerifier, ['email', 'profile'])

  setCookie(event, 'google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  })

  setCookie(event, 'google_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  })

  return sendRedirect(event, url.toString())
})