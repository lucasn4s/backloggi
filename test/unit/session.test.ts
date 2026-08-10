import { describe, it, expect, vi, beforeEach } from 'vitest'

const luciaMock = {
  createBlankSessionCookie: vi.fn(() => ({
    name: 'auth_session',
    value: '',
    attributes: { path: '/', sameSite: 'lax' },
  })),
  validateSession: vi.fn(),
  sessionCookieName: 'auth_session',
}

vi.mock('~/services/auth', () => ({
  lucia: luciaMock,
}))

const getCookieMock = vi.fn()
const setCookieMock = vi.fn()
vi.stubGlobal('getCookie', getCookieMock)
vi.stubGlobal('setCookie', setCookieMock)

function makeEvent() {
  return { path: '/api/auth/session' } as any
}

describe('Session API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCookieMock.mockReturnValue('session_id_1')
  })

  it('should return only sanitized user data (no internal session.id)', async () => {
    const luciaSession = { id: 'session_id_1', fresh: true, expiresAt: new Date() }
    const luciaUser = {
      id: 'user_1',
      email: 'user@example.com',
      name: 'Jane',
      avatarUrl: 'https://lh3.googleusercontent.com/photo',
    }
    luciaMock.validateSession.mockResolvedValue({ session: luciaSession, user: luciaUser })

    const { default: handler } = await import('#server/api/auth/session.get')
    const result = await handler(makeEvent())

    expect(result).toEqual({
      user: {
        id: 'user_1',
        email: 'user@example.com',
        name: 'Jane',
        avatarUrl: 'https://lh3.googleusercontent.com/photo',
      },
    })
    expect(JSON.stringify(result)).not.toContain('session_id_1')
  })

  it('should throw 401 and clear cookie when no session cookie present', async () => {
    getCookieMock.mockReturnValue(null)

    const { default: handler } = await import('#server/api/auth/session.get')

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
    expect(setCookieMock).not.toHaveBeenCalled()
  })

  it('should throw 401 and clear cookie when session is invalid', async () => {
    luciaMock.validateSession.mockResolvedValue({ session: null, user: null })

    const { default: handler } = await import('#server/api/auth/session.get')

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
    expect(setCookieMock).toHaveBeenCalled()
  })
})
