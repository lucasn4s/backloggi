import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const RATE_LIMITED_PATHS = new Set<string>([
  '/auth/login',
  '/auth/callback',
])

let rateLimiter: Ratelimit | null = null

function getRateLimiter(event: Parameters<typeof defineEventHandler>[0] extends (e: infer E) => unknown ? E : never) {
  if (rateLimiter) return rateLimiter

  const config = useRuntimeConfig(event)

  if (!config.upstashRedisRestUrl || !config.upstashRedisRestToken) {
    return null
  }

  const redis = new Redis({
    url: config.upstashRedisRestUrl,
    token: config.upstashRedisRestToken,
  })

  rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'ratelimit:auth',
  })

  return rateLimiter
}

export default defineEventHandler(async (event) => {
  const rawPath = event.path ?? getRequestURL(event).pathname
  const path = rawPath.split('?')[0]

  if (!RATE_LIMITED_PATHS.has(path)) return

  const limiter = getRateLimiter(event)
  if (!limiter) return

  const identifier = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  const { success } = await limiter.limit(identifier)

  if (!success) {
    throw createError({ statusCode: 429, message: 'Too many requests. Please try again later.' })
  }
})
