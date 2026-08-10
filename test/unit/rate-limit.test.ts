import { describe, it, expect, vi, beforeEach } from 'vitest'

const limitMock = vi.fn()

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = () => ({})
    limit = limitMock
  },
}))

vi.mock('@upstash/redis', () => ({
  Redis: class {},
}))

const getRequestIPMock = vi.fn()

vi.stubGlobal('getRequestIP', getRequestIPMock)
vi.stubGlobal('useRuntimeConfig', () => ({
  upstashRedisRestUrl: 'http://localhost:6379',
  upstashRedisRestToken: 'token',
}))

function makeEvent(path: string) {
  return { path, node: { req: { url: path, headers: {} }, res: {} } } as any
}

describe('Auth rate limit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    limitMock.mockResolvedValue({ success: true })
    getRequestIPMock.mockReturnValue('192.168.0.1')
  })

  it('should call rate limiter on /auth/login', async () => {
    const { default: middleware } = await import('#server/middleware/rateLimit')
    await middleware(makeEvent('/auth/login'))

    expect(limitMock).toHaveBeenCalledTimes(1)
  })

  it('should call rate limiter on /auth/callback', async () => {
    const { default: middleware } = await import('#server/middleware/rateLimit')
    await middleware(makeEvent('/auth/callback'))

    expect(limitMock).toHaveBeenCalledTimes(1)
  })

  it('should NOT call rate limiter on non-auth paths', async () => {
    const { default: middleware } = await import('#server/middleware/rateLimit')
    await middleware(makeEvent('/api/backlog'))
    await middleware(makeEvent('/dashboard'))
    await middleware(makeEvent('/'))

    expect(limitMock).not.toHaveBeenCalled()
  })

  it('should throw 429 when limit is exceeded', async () => {
    limitMock.mockResolvedValue({ success: false })

    const { default: middleware } = await import('#server/middleware/rateLimit')

    await expect(middleware(makeEvent('/auth/login'))).rejects.toMatchObject({ statusCode: 429 })
  })

  it('should not throw when limit is not exceeded', async () => {
    const { default: middleware } = await import('#server/middleware/rateLimit')

    await expect(middleware(makeEvent('/auth/login'))).resolves.not.toThrow()
  })

  it('should skip rate limiting when Upstash is not configured (fail-open)', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      upstashRedisRestUrl: '',
      upstashRedisRestToken: '',
    }))
    vi.resetModules()

    const { default: middleware } = await import('#server/middleware/rateLimit')

    await expect(middleware(makeEvent('/auth/login'))).resolves.not.toThrow()
    expect(limitMock).not.toHaveBeenCalled()

    vi.stubGlobal('useRuntimeConfig', () => ({
      upstashRedisRestUrl: 'http://localhost:6379',
      upstashRedisRestToken: 'token',
    }))
    vi.resetModules()
  })
})
