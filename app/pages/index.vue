<script setup lang="ts">
const { isAuthenticated } = useAuth()

onMounted(async () => {
  await useAuth().fetchSession()
  if (isAuthenticated.value) {
    await navigateTo('/dashboard')
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
    <h1 class="text-4xl font-bold mb-4">Track Your Gaming Backlog</h1>
    <p class="text-gray-400 mb-8 max-w-md">
      Search games, track what you're playing, and never forget what's on your backlog.
    </p>
    <a href="/auth/login" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition">
      Sign in with Google
    </a>
  </div>
</template>