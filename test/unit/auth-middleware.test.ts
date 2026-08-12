import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('#server/utils/auth', () => ({
  requireAuth: vi.fn(),
}))

import { requireAuth } from '#server/utils/auth'

const mockRequireAuth = vi.mocked(requireAuth)

function makeEvent(path: string) {
  return {
    path,
    node: { req: { url: path }, res: {} },
  } as any
}

describe('Global auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ user: { id: 'u1' }, session: { id: 's1' } } as any)
  })

  it('should call requireAuth on /api/ paths', async () => {
    vi.resetModules()
    const { default: middleware } = await import('#server/middleware/auth')
    await middleware(makeEvent('/api/backlog'), {} as any)
    expect(mockRequireAuth).toHaveBeenCalledTimes(1)
  })

  it('should NOT call requireAuth on non-/api/ paths', async () => {
    vi.resetModules()
    const { default: middleware } = await import('#server/middleware/auth')
    await middleware(makeEvent('/'), {} as any)
    await middleware(makeEvent('/auth/login'), {} as any)
    await middleware(makeEvent('/dashboard'), {} as any)
    expect(mockRequireAuth).not.toHaveBeenCalled()
  })

  it('should NOT call requireAuth on /api/auth/session (public endpoint)', async () => {
    vi.resetModules()
    const { default: middleware } = await import('#server/middleware/auth')
    await middleware(makeEvent('/api/auth/session'), {} as any)
    expect(mockRequireAuth).not.toHaveBeenCalled()
  })

  it('should treat query strings as the same path for allowlist matching', async () => {
    vi.resetModules()
    const { default: middleware } = await import('#server/middleware/auth')
    await middleware(makeEvent('/api/auth/session?ref=email'), {} as any)
    expect(mockRequireAuth).not.toHaveBeenCalled()
  })

  it('should propagate errors thrown by requireAuth', async () => {
    vi.resetModules()
    mockRequireAuth.mockRejectedValueOnce(new Error('Unauthorized'))
    const { default: middleware } = await import('#server/middleware/auth')
    await expect(middleware(makeEvent('/api/games/search'), {} as any)).rejects.toThrow('Unauthorized')
  })

  it('should protect all /api/ subpaths that are not in the public allowlist', async () => {
    vi.resetModules()
    const { default: middleware } = await import('#server/middleware/auth')
    const protectedPaths = [
      '/api/backlog',
      '/api/backlog/123',
      '/api/games/search',
      '/api/games/trending',
      '/api/games/42',
    ]
    for (const p of protectedPaths) {
      await middleware(makeEvent(p), {} as any)
    }
    expect(mockRequireAuth).toHaveBeenCalledTimes(protectedPaths.length)
  })
})
