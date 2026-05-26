import { searchGames } from '~/services/igdb'
import { requireAuth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const q = (query.q as string)?.trim()

  if (!q || q.length < 2) {
    throw createError({ statusCode: 400, message: 'Search query must be at least 2 characters' })
  }

  const page = Number(query.page) || 0
  const limit = 20
  const offset = page * limit

  const games = await searchGames(q, limit, offset)
  return games
})