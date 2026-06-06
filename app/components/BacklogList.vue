<script setup lang="ts">
import type { BacklogEntryWithGame } from '~/composables/useBacklog'
import type { BacklogStatus } from '~/composables/useBacklog'

const props = defineProps<{
  status: BacklogStatus
  entries: BacklogEntryWithGame[]
}>()

const emit = defineEmits<{
  remove: [entryId: number]
  update: [entryId: number, updates: { status?: BacklogStatus; rating?: number; notes?: string }]
}>()

const statusLabels: Record<BacklogStatus, string> = {
  playing: 'Currently Playing',
  backlog: 'Backlog',
  completed: 'Completed',
  dropped: 'Dropped',
}

const statusColors: Record<BacklogStatus, string> = {
  playing: 'text-green-400',
  backlog: 'text-yellow-400',
  completed: 'text-blue-400',
  dropped: 'text-red-400',
}

function coverUrl(entry: BacklogEntryWithGame): string | null {
  if (!entry.game?.coverUrl) return null
  return `https:${entry.game.coverUrl.replace('t_thumb', 't_cover_big')}`
}
</script>

<template>
  <section v-if="entries.length > 0" class="mb-8">
    <h2 class="text-lg font-semibold mb-3" :class="statusColors[status]">
      {{ statusLabels[status] }} ({{ entries.length }})
    </h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="bg-gray-900 rounded-lg p-3 flex flex-col gap-2"
      >
        <img
          v-if="coverUrl(entry)"
          :src="coverUrl(entry)"
          :alt="entry.game?.name"
          class="w-full aspect-[3/4] object-cover rounded"
        />
        <div v-else class="w-full aspect-[3/4] bg-gray-800 rounded flex items-center justify-center text-gray-600 text-xs">
          No Cover
        </div>
        <div class="text-sm font-medium truncate">{{ entry.game?.name ?? `Game #${entry.igdbGameId}` }}</div>
        <div class="flex gap-1 mt-auto">
          <select
            :value="entry.status"
            @change="emit('update', entry.id, { status: ($event.target as HTMLSelectElement).value as BacklogStatus })"
            class="text-xs bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-gray-300"
          >
            <option value="playing">Playing</option>
            <option value="backlog">Backlog</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>
          <button
            @click="emit('remove', entry.id)"
            class="text-xs text-red-400 hover:text-red-300 ml-auto"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </section>
</template>