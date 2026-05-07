# AGENTS.md - Backloggi Development Guide

## Project Overview

Backloggi is a Nuxt 4 + Vue 3 + TypeScript application using @nuxt/ui and Tailwind CSS 4. It's a personal backlog tracking application integrated with Twitch.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Generate static site
npm run generate
```

### RESTRICTIONS

- You should NEVER access sensitive files (like .env), if you need anything from that, ask the user to prompt the information.

### Running a Single Test

No test framework is currently configured. If adding tests in the future:
- Use **Vitest** for unit/component testing
- Run a single test file: `npx vitest run src/components/__tests__/MyComponent.spec.ts`
- Run a single test: `npx vitest run -t "test name pattern"`

## Code Style Guidelines

### General Principles

- Keep files small and focused (max ~200 lines for components)
- Use TypeScript for all new code - avoid `any`
- Prefer composition API (`<script setup>`) over options API

### Vue Components

```vue
<script setup lang="ts">
// Imports at top
import { ref, computed } from 'vue'
import SomeComponent from './components/SomeComponent.vue'
import type { SomeType } from './types'

// Reactive state using ref/reactive
const count = ref(0)
const items = ref<MyType[]>([])

// Computed properties
const hasItems = computed(() => items.value.length > 0)

// Functions
function handleClick(id: string) {
  // ...
}
</script>

<template>
  <!-- Use self-closing tags for components without content -->
  <SomeComponent />
  
  <!-- Pass props with shorthand when name matches -->
  <UButton :icon="Icon" label="Click me" />
  
  <!-- Use consistent class attribute formatting -->
  <div
    class="flex items-center justify-between"
  >
    Content
  </div>
</template>

<style scoped>
/* Scoped styles only when Tailwind isn't sufficient */
</style>
```

### Imports & Paths

- Use relative imports for local files: `./components/Foo.vue`
- Use aliased imports for modules: `~/assets/css/main.css`
- Nuxt auto-imports: `useRoute`, `useRouter`, `useRuntimeConfig`, `useCookie`, `useState`, `useNuxtApp`
- Group imports: external, auto-imported, relative local

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TrendingGame.vue` |
| Composables | camelCase + use prefix | `useAuth.ts` |
| Types/Interfaces | PascalCase | `GameItem` |
| Props | camelCase | `gameId` |
| CSS Classes | kebab-case | `.game-card` |

### TypeScript Guidelines

```typescript
// Prefer interfaces for objects
interface GameItem {
  id: string
  title: string
  completed?: boolean
}

// Use type for unions/literals
type GameStatus = 'playing' | 'completed' | 'backlog'

// Avoid 'any', use 'unknown' when type is truly unknown
function parseData(data: unknown): GameItem {
  if (isGameItem(data)) {
    return data
  }
  throw new Error('Invalid data')
}

// Explicit return types for complex functions
async function fetchGames(): Promise<GameItem[]> {
  const response = await $fetch('/api/games')
  return response as GameItem[]
}
```

### Error Handling

```typescript
// Use try/catch with proper typing
async function fetchData() {
  try {
    const data = await $fetch<GameItem[]>('/api/games')
    return { data, error: null }
  } catch (err) {
    console.error('Failed to fetch games:', err)
    return { data: null, error: err as Error }
  }
}

// For components, store errors in ref
const error = ref<string | null>(null)

function handleSubmit() {
  error.value = null
  try {
    // ...
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  }
}
```

### Tailwind CSS

- Use Tailwind utility classes for all styling (no custom CSS unless necessary)
- Use semantic HTML structure
- Keep classes organized: layout → spacing → sizing → typography → visual

```vue
<div class="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
  <span class="text-sm font-medium text-gray-700">Label</span>
  <UButton color="primary" size="sm">Action</UButton>
</div>
```

### File Organization

```
app/
├── assets/          # Static assets (CSS, images)
├── components/      # Vue components (auto-imported)
├── composables/     # Vue composables (useXxx)
├── layouts/         # Page layouts
├── pages/           # File-based routing
├── services/        # API/business logic
├── types/           # TypeScript types
└── app.vue          # Root app component
```

### Nuxt Specific

- Use `definePageMeta` for page-specific config
- Use `useRuntimeConfig` for environment variables (not `process.env`)
- Use `useCookie` for client-side cookies
- Place secrets in `.env` (never commit) and access via `runtimeConfig.public`
- Enable strict mode in tsconfig when possible

### Git Conventions

- Commit messages: imperative mood ("Add user auth" not "Added user auth")
- Keep commits atomic and focused
- Create feature branches for new features
- Run `npm run build` before committing to ensure no build errors

### Dependencies

Only add dependencies when necessary. Before adding:
1. Check if existing packages (@nuxt/ui) have the functionality
2. Consider using composables/utils instead of new packages
3. Ensure the package is actively maintained
