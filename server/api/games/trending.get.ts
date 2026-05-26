import { getTrendingGames } from '~/services/igdb'
import { requireAuth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const games = await getTrendingGames()
  return games
})