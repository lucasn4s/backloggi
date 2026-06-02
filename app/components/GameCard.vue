<script setup lang="ts">
import type { IgdbGame } from '~/services/igdb'

const props = defineProps<{
  game: IgdbGame
  showAddButton?: boolean
}>()

const emit = defineEmits<{
  add: [gameId: number]
}>()

const coverUrl = computed(() => {
  if (!props.game.cover?.url) return null
  return `https:${props.game.cover.url.replace('t_thumb', 't_cover_big')}`
})

const releaseYear = computed(() => {
  if (!props.game.release_dates?.length) return null
  return props.game.release_dates[0].y
})
</script>

<template>
  <NuxtLink :to="`/games/${game.id}`" class="block group">
    <div class="bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition">
      <div class="aspect-[3/4] bg-gray-800 relative">
        <img
          v-if="coverUrl"
          :src="coverUrl"
          :alt="game.name"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-gray-600">
          No Cover
        </div>
      </div>
      <div class="p-3">
        <h3 class="font-medium text-sm truncate">{{ game.name }}</h3>
        <p v-if="releaseYear" class="text-xs text-gray-500 mt-1">{{ releaseYear }}</p>
      </div>
      <div v-if="showAddButton" class="px-3 pb-3">
        <UButton
          size="sm"
          color="primary"
          variant="solid"
          @click.prevent="emit('add', game.id)"
          class="w-full"
        >
          Add to Backlog
        </UButton>
      </div>
    </div>
  </NuxtLink>
</template>
