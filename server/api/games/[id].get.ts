import { getGameById } from '~/services/igdb'
import { requireAuth } from '#server/utils/auth'
import { gameIdParamSchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const { id } = gameIdParamSchema.parse({ id: getRouterParam(event, 'id') })

  const config = useRuntimeConfig(event)

  try {
    const game = await getGameById(id, config.twitchClientId, config.twitchClientSecret)
    return game
  } catch {
    throw createError({ statusCode: 404, message: 'Game not found' })
  }
})
