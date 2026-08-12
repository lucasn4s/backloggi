import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  try {
    const entries = await db.query.backlogEntries.findMany({
      where: eq(backlogEntries.userId, user.id),
      orderBy: (entries, { desc }) => [desc(entries.updatedAt)],
      with: {
        game: true,
      },
    })

    return entries
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err) throw err
    console.error('Failed to fetch backlog:', err)
    throw createError({ statusCode: 500, message: 'Internal server error' })
  }
})
