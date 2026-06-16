export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, fetchSession } = useAuth()

  if (!isAuthenticated.value) {
    const expired = await fetchSession()
    if (expired) {
      return navigateTo('/auth/login')
    }
  }

  if (!isAuthenticated.value) {
    return navigateTo('/', { redirectCode: 302 })
  }
})
