import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const entry = await db.query.backlogEntries.findFirst({
    where: and(
      eq(backlogEntries.id, id),
      eq(backlogEntries.userId, user.id),
    ),
  })

  if (!entry) {
    throw createError({ statusCode: 404, message: 'Entry not found' })
  }

  await db.update(backlogEntries)
    .set({
      status: body.status ?? entry.status,
      rating: body.rating !== undefined ? body.rating : entry.rating,
      notes: body.notes !== undefined ? body.notes : entry.notes,
      updatedAt: Date.now(),
    })
    .where(eq(backlogEntries.id, id))

  const [updated] = await db.query.backlogEntries.findMany({
    where: eq(backlogEntries.id, id),
    limit: 1,
  })

  return updated
})
