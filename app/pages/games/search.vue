<script setup lang="ts">
import type { IgdbGame } from '~/services/igdb'

definePageMeta({
  middleware: 'auth',
})

const searchQuery = ref('')
const page = ref(0)
const { searchResults, loading, error, searchGames } = useGames()
const { addToBacklog } = useBacklog()

async function handleSearch() {
  if (searchQuery.value.trim().length < 2) return
  page.value = 0
  await searchGames(searchQuery.value, page.value)
}

async function handleAdd(game: IgdbGame) {
  try {
    await addToBacklog(game.id, {
      gameName: game.name,
      gameCoverUrl: game.cover?.url ?? null,
    })
  } catch {
    // Error handled by composable
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Browse Games</h1>

    <form @submit.prevent="handleSearch" class="mb-6">
      <div class="flex gap-2">
        <UInput
          v-model="searchQuery"
          placeholder="Search for a game..."
          class="flex-1"
          @keydown.enter="handleSearch"
        />
        <UButton type="submit" color="primary" :disabled="loading">Search</UButton>
      </div>
    </form>

    <div v-if="error" class="text-red-400 text-center py-8">{{ error }}</div>

    <div v-if="loading" class="text-center py-12 text-gray-500">Searching...</div>

    <div
      v-else-if="searchResults.length > 0"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
    >
      <GameCard
        v-for="game in searchResults"
        :key="game.id"
        :game
        :show-add-button="true"
        @add="handleAdd"
      />
    </div>

    <div v-else-if="searchQuery" class="text-center py-12 text-gray-500">
      No results found for "{{ searchQuery }}"
    </div>
  </div>
</template>
