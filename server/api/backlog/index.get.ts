import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const entries = await db.query.backlogEntries.findMany({
    where: eq(backlogEntries.userId, user.id),
    orderBy: (entries, { desc }) => [desc(entries.updatedAt)],
  })

  return entries
})
