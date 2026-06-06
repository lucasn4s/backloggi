export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, fetchSession } = useAuth()

  if (!isAuthenticated.value) {
    await fetchSession()
  }

  if (!isAuthenticated.value) {
    return navigateTo('/', { redirectCode: 302 })
  }
})
