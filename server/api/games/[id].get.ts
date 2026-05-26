import { getGameById } from '~/services/igdb'
import { requireAuth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid game ID' })
  }

  try {
    const game = await getGameById(id)
    return game
  } catch {
    throw createError({ statusCode: 404, message: 'Game not found' })
  }
})