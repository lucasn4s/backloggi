<script setup lang="ts">
import { postTwitchAuth } from './services/twitch-auth';
import type { NavigationMenuItem } from '@nuxt/ui';

const twitchToken = useCookie('twitchToken');
const config = useRuntimeConfig();

twitchToken.value = await postTwitchAuth(
  config.public.TWITCH_CLIENT_ID,
  config.public.TWITCH_CLIENT_SECRET,
);

const route = useRoute();

const items: NavigationMenuItem[] = [
  {
    label: 'Home',
    to: { name: 'index' },
  },
  {
    label: 'My Backlog',
    to: { name: 'my-backlog' },
    active: route.path?.startsWith('/my-backlog'),
  },
];
</script>

<template>
  <UApp>
    <NuxtLayout>
      <UHeader>
        <template #left>Backloggi</template>
      </UHeader>
      <div
        class="flex items-center"
      >
        <UNavigationMenu
          :items
          orientation="vertical"
          variant="link"
          :highlight="true"
          class="data-[orientation=vertical]:w-48"
        />
        <NuxtPage />
      </div>
    </NuxtLayout>
  </UApp>
</template>
