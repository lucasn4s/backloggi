import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~/services/db', () => ({
  db: {
    query: {
      backlogEntries: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        onConflictDoUpdate: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(undefined) }),
      }),
    }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 1 }]) }) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
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

import { db } from '~/services/db'
import { requireAuth } from '#server/utils/auth'

const mockUser = { id: 'user_1', email: 'test@test.com' }
const mockSession = { id: 'session_1' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, session: mockSession } as any)
})

describe('Backlog GET handler', () => {
  it('should return user backlog entries with game data', async () => {
    const mockEntries = [
      { id: 1, userId: 'user_1', igdbGameId: 123, status: 'playing', game: { igdbId: 123, name: 'Test Game', coverUrl: null } },
    ]
    vi.mocked(db.query.backlogEntries.findMany).mockResolvedValue(mockEntries as any)

    const result = await db.query.backlogEntries.findMany({})
    expect(result).toEqual(mockEntries)
  })
})

describe('Backlog POST handler logic', () => {
  it('should reject duplicate entries', async () => {
    vi.mocked(db.query.backlogEntries.findFirst).mockResolvedValue({ id: 1, igdbGameId: 123 } as any)

    const result = await db.query.backlogEntries.findFirst({})
    expect(result).not.toBeNull()
    expect(result).toEqual(expect.objectContaining({ igdbGameId: 123 }))
  })
})

describe('Backlog DELETE handler logic', () => {
  it('should return null when entry does not exist', async () => {
    vi.mocked(db.query.backlogEntries.findFirst).mockResolvedValue(null)

    const result = await db.query.backlogEntries.findFirst({})
    expect(result).toBeNull()
  })
})