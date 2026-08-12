import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { and, eq } from 'drizzle-orm'
import { gameIdParamSchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const { id } = gameIdParamSchema.parse({ id: getRouterParam(event, 'id') })

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

    await db.delete(backlogEntries).where(eq(backlogEntries.id, id))

    return { success: true }
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err) throw err
    console.error('Failed to delete backlog entry:', err)
    throw createError({ statusCode: 500, message: 'Internal server error' })
  }
})
