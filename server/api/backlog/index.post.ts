import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const body = await readBody(event)

  if (!body.igdbGameId) {
    throw createError({ statusCode: 400, message: 'igdbGameId is required' })
  }

  const existing = await db.query.backlogEntries.findFirst({
    where: (entries, { and }) => and(
      eq(entries.userId, user.id),
      eq(entries.igdbGameId, body.igdbGameId),
    ),
  })

  if (existing) {
    throw createError({ statusCode: 409, message: 'Game already in backlog' })
  }

  const now = Date.now()

  await db.insert(backlogEntries).values({
    userId: user.id,
    igdbGameId: body.igdbGameId,
    status: body.status || 'backlog',
    addedAt: now,
    updatedAt: now,
  })

  const [entry] = await db.query.backlogEntries.findMany({
    where: (entries, { and }) => and(
      eq(entries.userId, user.id),
      eq(entries.igdbGameId, body.igdbGameId),
    ),
    limit: 1,
    orderBy: (entries, { desc }) => [desc(entries.addedAt)],
  })

  return entry
})
