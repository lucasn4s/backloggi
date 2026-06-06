import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { and, eq } from 'drizzle-orm'
import { backlogUpdateSchema, validateBody, gameIdParamSchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const { id } = gameIdParamSchema.parse({ id: getRouterParam(event, 'id') })
  const body = await readBody(event)
  const data = validateBody(backlogUpdateSchema, body)

  const entry = await db.query.backlogEntries.findFirst({
    where: and(
      eq(backlogEntries.id, id),
      eq(backlogEntries.userId, user.id),
    ),
  })

  if (!entry) {
    throw createError({ statusCode: 404, message: 'Entry not found' })
  }

  const [updated] = await db.update(backlogEntries)
    .set({
      status: data.status ?? entry.status,
      rating: data.rating !== undefined ? data.rating : entry.rating,
      notes: data.notes !== undefined ? data.notes : entry.notes,
      updatedAt: new Date(),
    })
    .where(eq(backlogEntries.id, id))
    .returning()

  return updated
})
