<script setup lang="ts">
const { isAuthenticated } = useAuth()
const { grouped, loading, fetchBacklog, addToBacklog } = useBacklog()
const { trendingGames, fetchTrending, loading: trendingLoading } = useGames()

onMounted(async () => {
  await useAuth().fetchSession()
  if (!isAuthenticated.value) {
    await navigateTo('/')
    return
  }
  await fetchBacklog()
  await fetchTrending()
})

const totalCount = computed(() =>
  grouped.value.playing.length +
  grouped.value.backlog.length +
  grouped.value.completed.length +
  grouped.value.dropped.length
)

async function handleAdd(gameId: number) {
  try {
    await addToBacklog(gameId)
  } catch {
    // Error handled by composable
  }
}
</script>

<template>
  <div>
    <!-- Stats Bar -->
    <div v-if="loading" class="text-center py-4 text-gray-500">Loading...</div>
    <div v-else-if="totalCount > 0" class="flex items-center gap-4 mb-6 text-sm text-gray-400 flex-wrap">
      <span><span class="text-green-400 font-medium">{{ grouped.playing.length }}</span> Playing</span>
      <span><span class="text-yellow-400 font-medium">{{ grouped.backlog.length }}</span> Backlog</span>
      <span><span class="text-blue-400 font-medium">{{ grouped.completed.length }}</span> Completed</span>
      <span><span class="text-red-400 font-medium">{{ grouped.dropped.length }}</span> Dropped</span>
      <NuxtLink to="/backlog" class="text-blue-400 hover:text-blue-300 ml-auto">
        View Backlog →
      </NuxtLink>
    </div>
    <div v-else class="text-center py-4 mb-6">
      <span class="text-gray-500">Your backlog is empty</span>
      <NuxtLink to="/games/search" class="text-blue-400 hover:text-blue-300 ml-2">
        Browse Games →
      </NuxtLink>
    </div>

    <!-- Trending Section -->
    <section v-if="!trendingLoading && trendingGames.length > 0">
      <h2 class="text-lg font-semibold mb-3 text-orange-400">Trending Games</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <GameCard
          v-for="game in trendingGames"
          :key="game.id"
          :game
          :show-add-button="true"
          @add="handleAdd"
        />
      </div>
    </section>
  </div>
</template>