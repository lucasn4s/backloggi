import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries, games } from '~/services/db'
import { eq } from 'drizzle-orm'
import { backlogCreateSchema, validateBody } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const body = await readBody(event)
  const data = validateBody(backlogCreateSchema, body)

  const existing = await db.query.backlogEntries.findFirst({
    where: (entries, { and }) => and(
      eq(entries.userId, user.id),
      eq(entries.igdbGameId, data.igdbGameId),
    ),
  })

  if (existing) {
    throw createError({ statusCode: 409, message: 'Game already in backlog' })
  }

  await db.insert(games)
    .values({
      igdbId: data.igdbGameId,
      name: data.gameName,
      coverUrl: data.gameCoverUrl ?? null,
    })
    .onConflictDoUpdate({
      target: games.igdbId,
      set: {
        name: data.gameName,
        coverUrl: data.gameCoverUrl ?? null,
        updatedAt: new Date(),
      },
    })

  const [entry] = await db.insert(backlogEntries).values({
    userId: user.id,
    igdbGameId: data.igdbGameId,
    status: data.status || 'backlog',
  }).returning()

  return entry
})
