import { describe, it, expect, vi, beforeEach } from 'vitest'
import { googleOAuthQuerySchema, googleUserSchema } from '#server/utils/validation'

describe('googleOAuthQuerySchema', () => {
  it('should parse valid state and code', () => {
    const result = googleOAuthQuerySchema.safeParse({ state: 'abc123', code: 'xyz789' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ state: 'abc123', code: 'xyz789' })
    }
  })

  it('should reject missing state', () => {
    const result = googleOAuthQuerySchema.safeParse({ code: 'xyz789' })
    expect(result.success).toBe(false)
  })

  it('should reject missing code', () => {
    const result = googleOAuthQuerySchema.safeParse({ state: 'abc123' })
    expect(result.success).toBe(false)
  })

  it('should reject array values (e.g. ?code=a&code=b)', () => {
    const result = googleOAuthQuerySchema.safeParse({ state: 'abc123', code: ['a', 'b'] })
    expect(result.success).toBe(false)
  })

  it('should reject non-string values', () => {
    const result = googleOAuthQuerySchema.safeParse({ state: 42, code: {} })
    expect(result.success).toBe(false)
  })
})

describe('googleUserSchema', () => {
  it('should parse a valid google user', () => {
    const result = googleUserSchema.safeParse({
      email: 'user@example.com',
      name: 'Jane Doe',
      picture: 'https://lh3.googleusercontent.com/photo',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        email: 'user@example.com',
        name: 'Jane Doe',
        picture: 'https://lh3.googleusercontent.com/photo',
      })
    }
  })

  it('should default missing name to empty string', () => {
    const result = googleUserSchema.parse({ email: 'user@example.com' })
    expect(result.name).toBe('')
  })

  it('should allow null or missing picture', () => {
    const result = googleUserSchema.parse({ email: 'user@example.com' })
    expect(result.picture).toBeNull()
  })

  it('should reject invalid email', () => {
    const result = googleUserSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('should reject invalid picture url', () => {
    const result = googleUserSchema.safeParse({ email: 'user@example.com', picture: 'javascript:alert(1)' })
    expect(result.success).toBe(false)
  })

  it('should reject missing email', () => {
    const result = googleUserSchema.safeParse({ name: 'Jane Doe' })
    expect(result.success).toBe(false)
  })
})

const deleteCookieMock = vi.fn()
const setCookieMock = vi.fn()
const sendRedirectMock = vi.fn()
const getCookieMock = vi.fn()
const getQueryMock = vi.fn()
const createErrorMock = vi.fn((opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  throw err
})

vi.stubGlobal('deleteCookie', deleteCookieMock)
vi.stubGlobal('setCookie', setCookieMock)
vi.stubGlobal('sendRedirect', sendRedirectMock)
vi.stubGlobal('getCookie', getCookieMock)
vi.stubGlobal('getQuery', getQueryMock)
vi.stubGlobal('createError', createErrorMock)

vi.mock('~/services/auth', () => ({
  lucia: {
    createSession: vi.fn(),
    createSessionCookie: vi.fn((id: string) => ({
      name: 'auth_session',
      value: `session_${id}`,
      attributes: { path: '/', sameSite: 'lax' },
    })),
  },
  googleAuth: {
    validateAuthorizationCode: vi.fn(),
  },
}))

vi.mock('~/services/db', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
  },
  users: {},
  backlogEntries: {},
  games: {},
}))

vi.mock('~/db/schema', () => ({ users: { email: 'email' } }))
vi.mock('lucia', () => ({ generateIdFromEntropySize: vi.fn(() => 'user_1') }))
vi.mock('drizzle-orm', () => ({ eq: (a: unknown) => a }))

import { googleAuth, lucia } from '~/services/auth'
import { db } from '~/services/db'

function makeEvent() {
  return { path: '/auth/callback' } as any
}

describe('OAuth callback handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteCookieMock.mockClear()
    getCookieMock.mockImplementation((_event: any, name: string) => {
      if (name === 'google_oauth_state') return 'state_123'
      if (name === 'google_code_verifier') return 'verifier_1'
      return null
    })
    getQueryMock.mockReturnValue({ state: 'state_123', code: 'code_456' })
    vi.mocked(googleAuth.validateAuthorizationCode).mockResolvedValue({
      accessToken: () => 'token_abc',
    } as any)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ email: 'user@example.com', name: 'Jane', picture: 'https://lh3.googleusercontent.com/x' }),
    } as Response)
    vi.mocked(lucia.createSession).mockResolvedValue({ id: 'session_1' } as any)
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null)
    vi.mocked(db.insert).mockReturnValue({ values: vi.fn() } as any)
  })

  it('should delete OAuth cookies after successful callback', async () => {
    const { default: handler } = await import('#server/routes/auth/callback.get')
    await handler(makeEvent())

    expect(deleteCookieMock).toHaveBeenCalledWith(expect.anything(), 'google_oauth_state', expect.anything())
    expect(deleteCookieMock).toHaveBeenCalledWith(expect.anything(), 'google_code_verifier', expect.anything())
  })

  it('should throw 400 on invalid state mismatch', async () => {
    getCookieMock.mockImplementation((_event: any, name: string) => {
      if (name === 'google_oauth_state') return 'different_state'
      if (name === 'google_code_verifier') return 'verifier_1'
      return null
    })

    const { default: handler } = await import('#server/routes/auth/callback.get')

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
    expect(deleteCookieMock).not.toHaveBeenCalled()
  })

  it('should throw 400 on malformed query params', async () => {
    getQueryMock.mockReturnValue({ code: ['a', 'b'] })

    const { default: handler } = await import('#server/routes/auth/callback.get')

    await expect(handler(makeEvent())).rejects.toThrow()
    expect(googleAuth.validateAuthorizationCode).not.toHaveBeenCalled()
  })
})
