<script setup lang="ts">
const { isAuthenticated, user, signOut } = useAuth()

onMounted(async () => {
  await useAuth().fetchSession()
})
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white">
    <header class="border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="text-xl font-bold">Backloggi</NuxtLink>
        <nav v-if="isAuthenticated" class="flex items-center gap-4">
          <NuxtLink to="/backlog" class="text-sm text-gray-400 hover:text-white transition">
            My Backlog
          </NuxtLink>
          <NuxtLink to="/games/search" class="text-sm text-gray-400 hover:text-white transition">
            Browse
          </NuxtLink>
          <span class="text-sm text-gray-500">{{ user?.name }}</span>
          <button @click="signOut" class="text-sm text-gray-400 hover:text-white transition">
            Sign Out
          </button>
        </nav>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
</template>