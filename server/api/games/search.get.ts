import { searchGames } from '~/services/igdb'
import { requireAuth } from '#server/utils/auth'
import { gameSearchQuerySchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const { q, page } = gameSearchQuerySchema.parse(query)

  const config = useRuntimeConfig(event)
  const limit = 20
  const offset = page * limit

  const games = await searchGames(q, config.twitchClientId, config.twitchClientSecret, limit, offset)
  return games
})
