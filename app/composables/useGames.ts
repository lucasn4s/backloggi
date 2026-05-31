import type { IgdbGame } from '~/services/igdb'

export function useGames() {
  const searchResults = ref<IgdbGame[]>([])
  const trendingGames = ref<IgdbGame[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function searchGames(query: string, page = 0) {
    loading.value = true
    error.value = null
    try {
      searchResults.value = await $fetch<IgdbGame[]>('/api/games/search', {
        query: { q: query, page },
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
    } finally {
      loading.value = false
    }
  }

  async function fetchTrending() {
    loading.value = true
    error.value = null
    try {
      trendingGames.value = await $fetch<IgdbGame[]>('/api/games/trending')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load trending games'
    } finally {
      loading.value = false
    }
  }

  async function fetchGameById(id: number) {
    loading.value = true
    error.value = null
    try {
      return await $fetch<IgdbGame>(`/api/games/${id}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load game'
      return null
    } finally {
      loading.value = false
    }
  }

  return { searchResults, trendingGames, loading, error, searchGames, fetchTrending, fetchGameById }
}
