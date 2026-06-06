<script setup lang="ts">
import type { IgdbGame } from '~/services/igdb'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const gameId = Number(route.params.id)

const { fetchGameById, loading: gameLoading, error: gameError } = useGames()
const { addToBacklog, removeFromBacklog, entries, fetchBacklog } = useBacklog()

const game = ref<IgdbGame | null>(null)
const existingEntry = computed(() => entries.value.find(e => e.igdbGameId === gameId))

const coverUrl = computed(() => {
  if (!game.value?.cover?.url) return null
  return `https:${game.value.cover.url.replace('t_thumb', 't_cover_big')}`
})

const releaseYear = computed(() => {
  if (!game.value?.release_dates?.length) return null
  return game.value.release_dates[0].y
})

const genres = computed(() => game.value?.genres?.map(g => g.name).join(', ') || null)
const platforms = computed(() => game.value?.platforms?.map(p => p.name).join(', ') || null)

onMounted(async () => {
  await fetchBacklog()
  game.value = await fetchGameById(gameId)
})

async function handleAdd() {
  await addToBacklog(gameId)
}

async function handleRemove() {
  if (existingEntry.value) {
    await removeFromBacklog(existingEntry.value.id)
  }
}
</script>

<template>
  <div v-if="gameLoading" class="text-center py-12 text-gray-500">Loading...</div>
  <div v-else-if="gameError || !game" class="text-center py-12 text-red-400">
    {{ gameError || 'Game not found' }}
  </div>
  <div v-else class="max-w-4xl">
    <div class="flex flex-col md:flex-row gap-8">
      <div class="w-full md:w-64 flex-shrink-0">
        <img
          v-if="coverUrl"
          :src="coverUrl"
          :alt="game.name"
          class="w-full rounded-lg"
        />
        <div v-else class="w-full aspect-[3/4] bg-gray-800 rounded-lg flex items-center justify-center text-gray-600">
          No Cover
        </div>
      </div>
      <div class="flex-1">
        <h1 class="text-3xl font-bold mb-2">{{ game.name }}</h1>
        <div class="flex flex-wrap gap-2 mb-4 text-sm text-gray-400">
          <span v-if="releaseYear">{{ releaseYear }}</span>
          <span v-if="genres">{{ genres }}</span>
          <span v-if="platforms">{{ platforms }}</span>
        </div>
        <p v-if="game.summary" class="text-gray-300 mb-6 leading-relaxed">{{ game.summary }}</p>
        <div v-if="game.total_rating" class="mb-6">
          <span class="text-sm text-gray-400">Rating:</span>
          <span class="ml-2 text-lg font-semibold text-blue-400">{{ Math.round(game.total_rating) }}/100</span>
        </div>
        <div class="flex gap-3">
          <UButton
            v-if="!existingEntry"
            color="primary"
            @click="handleAdd"
          >
            Add to Backlog
          </UButton>
          <UButton
            v-else
            color="red"
            variant="outline"
            @click="handleRemove"
          >
            Remove from Backlog
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
