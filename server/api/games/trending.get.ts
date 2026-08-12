import { getTrendingGames } from '~/services/igdb'
import { requireAuth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const config = useRuntimeConfig(event)

  try {
    const games = await getTrendingGames(config.twitchClientId, config.twitchClientSecret)
    return games
  } catch (err) {
    if (err instanceof Error && 'statusCode' in err) throw err
    console.error('Failed to fetch trending games:', err)
    throw createError({ statusCode: 500, message: 'Internal server error' })
  }
})