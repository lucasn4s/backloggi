<script setup lang="ts">
const { isAuthenticated } = useAuth()
const { grouped, loading, error, fetchBacklog, removeFromBacklog, updateEntry } = useBacklog()

onMounted(async () => {
  await useAuth().fetchSession()
  if (!isAuthenticated.value) {
    await navigateTo('/')
    return
  }
  await fetchBacklog()
})

async function handleRemove(id: number) {
  await removeFromBacklog(id)
}

async function handleUpdate(id: number, updates: { status?: 'playing' | 'backlog' | 'completed' | 'dropped'; rating?: number; notes?: string }) {
  await updateEntry(id, updates)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">My Backlog</h1>
      <NuxtLink to="/games/search" class="text-sm text-blue-400 hover:text-blue-300">
        + Add Games
      </NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">Loading...</div>

    <div v-else-if="error" class="text-center py-12 text-red-400">{{ error }}</div>

    <div v-else-if="grouped.playing.length + grouped.backlog.length + grouped.completed.length + grouped.dropped.length === 0" class="text-center py-12">
      <p class="text-gray-500 mb-4">Your backlog is empty</p>
      <NuxtLink to="/games/search" class="px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-700 transition">
        Browse Games
      </NuxtLink>
    </div>

    <template v-else>
      <BacklogList status="playing" :entries="grouped.playing" @remove="handleRemove" @update="handleUpdate" />
      <BacklogList status="backlog" :entries="grouped.backlog" @remove="handleRemove" @update="handleUpdate" />
      <BacklogList status="completed" :entries="grouped.completed" @remove="handleRemove" @update="handleUpdate" />
      <BacklogList status="dropped" :entries="grouped.dropped" @remove="handleRemove" @update="handleUpdate" />
    </template>
  </div>
</template>
