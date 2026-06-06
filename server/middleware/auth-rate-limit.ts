import type { H3Event } from 'h3'

const authAttempts = new Map<string, { count: number; resetAt: number }>()
const AUTH_RATE_LIMIT = 10
const AUTH_RATE_WINDOW = 60 * 1000

function cleanupAuthRateLimit() {
  const now = Date.now()
  for (const [key, value] of authAttempts.entries()) {
    if (now > value.resetAt) {
      authAttempts.delete(key)
    }
  }
}

export default defineEventHandler(async (event: H3Event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  if (!path.startsWith('/auth/login') && !path.startsWith('/auth/callback')) {
    return
  }

  const ip = getRequestHeader(event, 'x-forwarded-for')
    || getRequestHeader(event, 'x-real-ip')
    || event.node.req.socket.remoteAddress
    || 'unknown'

  cleanupAuthRateLimit()

  const record = authAttempts.get(ip)

  if (!record) {
    authAttempts.set(ip, { count: 1, resetAt: Date.now() + AUTH_RATE_WINDOW })
    return
  }

  if (Date.now() > record.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: Date.now() + AUTH_RATE_WINDOW })
    return
  }

  record.count++

  if (record.count > AUTH_RATE_LIMIT) {
    throw createError({
      statusCode: 429,
      message: 'Too many authentication attempts. Please try again later.',
    })
  }
})
