import { requireAuth } from '../utils/auth'

const PUBLIC_API_PATHS = new Set<string>([
  '/api/auth/session',
])

export default defineEventHandler(async (event) => {
  const rawPath = event.path ?? getRequestURL(event).pathname
  const path = rawPath.split('?')[0]

  if (!path.startsWith('/api/')) return
  if (PUBLIC_API_PATHS.has(path)) return

  await requireAuth(event)
})
