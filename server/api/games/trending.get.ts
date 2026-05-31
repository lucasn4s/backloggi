import { getTrendingGames } from '~/services/igdb'
import { requireAuth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const config = useRuntimeConfig(event)

  const games = await getTrendingGames(config.twitchClientId, config.twitchClientSecret)
  return games
})