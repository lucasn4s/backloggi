import { requireAuth } from '../utils/auth'

const PUBLIC_API_PATHS = new Set<string>([
  '/api/auth/session',
])

export default defineEventHandler(async (event) => {
  const path = event.path ?? getRequestURL(event).pathname

  if (!path.startsWith('/api/')) return
  if (PUBLIC_API_PATHS.has(path)) return

  await requireAuth(event)
})
