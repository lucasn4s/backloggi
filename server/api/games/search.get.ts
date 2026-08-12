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

  try {
    const games = await searchGames(q, config.twitchClientId, config.twitchClientSecret, limit, offset)
    return games
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err) throw err
    console.error('Failed to search games:', err)
    throw createError({ statusCode: 500, message: 'Internal server error' })
  }
})
