import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~/services/db', () => ({
  db: {
    query: {
      backlogEntries: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  backlogEntries: {
    id: 'id',
    userId: 'user_id',
    igdbGameId: 'igdb_game_id',
    status: 'status',
    rating: 'rating',
    notes: 'notes',
    addedAt: 'added_at',
    updatedAt: 'updated_at',
  },
  games: {
    igdbId: 'igdb_id',
    name: 'name',
    coverUrl: 'cover_url',
    updatedAt: 'updated_at',
  },
}))

vi.mock('#server/utils/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('~/services/igdb', () => ({
  searchGames: vi.fn(),
  getTrendingGames: vi.fn(),
}))

vi.mock('#server/utils/validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#server/utils/validation')>()
  return {
    ...actual,
    validateBody: (schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } }, body: unknown) => {
      const result = schema.safeParse(body)
      if (!result.success) {
        throw createError({ statusCode: 400, message: 'Validation failed' })
      }
      return result.data
    },
  }
})

import { db } from '~/services/db'
import { requireAuth } from '#server/utils/auth'
import { searchGames, getTrendingGames } from '~/services/igdb'

const mockUser = { id: 'user_1', email: 'test@test.com' }
const mockSession = { id: 'session_1' }

vi.stubGlobal('getQuery', () => ({ q: 'zelda', page: '0' }))
vi.stubGlobal('getRouterParam', () => '1')
vi.stubGlobal('useRuntimeConfig', () => ({
  twitchClientId: 'client_id',
  twitchClientSecret: 'client_secret',
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, session: mockSession } as any)
})

function makeEvent(path: string) {
  return { path, node: { req: { url: path }, res: {} } } as any
}

describe('Backlog GET handler error handling', () => {
  it('should convert unexpected db errors to a generic 500', async () => {
    vi.mocked(db.query.backlogEntries.findMany).mockRejectedValue(new Error('relation "backlog_entries" does not exist'))

    const { default: handler } = await import('#server/api/backlog/index.get')

    await expect(handler(makeEvent('/api/backlog'))).rejects.toMatchObject({
      statusCode: 500,
      message: 'Internal server error',
    })
  })
})

describe('Backlog GET handler pass-through', () => {
  it('should let expected H3 errors (404) pass through unchanged', async () => {
    vi.mocked(db.query.backlogEntries.findFirst).mockRejectedValue(
      createError({ statusCode: 404, message: 'Entry not found' }),
    )

    const { default: handler } = await import('#server/api/backlog/[id].patch')

    await expect(handler(makeEvent('/api/backlog/1'))).rejects.toMatchObject({
      statusCode: 404,
      message: 'Entry not found',
    })
  })
})

describe('Games search handler error handling', () => {
  it('should convert unexpected IGDB service errors to a generic 500', async () => {
    vi.mocked(searchGames).mockRejectedValue(new Error('Unexpected socket hang up'))

    const { default: handler } = await import('#server/api/games/search.get')

    await expect(handler(makeEvent('/api/games/search?q=zelda'))).rejects.toMatchObject({
      statusCode: 500,
      message: 'Internal server error',
    })
  })
})

describe('Games trending handler error handling', () => {
  it('should convert unexpected IGDB service errors to a generic 500', async () => {
    vi.mocked(getTrendingGames).mockRejectedValue(new Error('Unexpected socket hang up'))

    const { default: handler } = await import('#server/api/games/trending.get')

    await expect(handler(makeEvent('/api/games/trending'))).rejects.toMatchObject({
      statusCode: 500,
      message: 'Internal server error',
    })
  })
})
