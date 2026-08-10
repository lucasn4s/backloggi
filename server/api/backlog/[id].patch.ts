import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { and, eq } from 'drizzle-orm'
import { backlogUpdateSchema, validateBody, gameIdParamSchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const { id } = gameIdParamSchema.parse({ id: getRouterParam(event, 'id') })
  const body = await readBody(event)
  const data = validateBody(backlogUpdateSchema, body)

  try {
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
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err) throw err
    console.error('Failed to update backlog entry:', err)
    throw createError({ statusCode: 500, message: 'Internal server error' })
  }
})
