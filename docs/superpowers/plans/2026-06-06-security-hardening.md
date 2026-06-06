# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical and medium security issues before deploying Backloggi as a portfolio/study app with Google auth and user data.

**Architecture:** Add `nuxt-security` module for HTTP security headers (CSP, HSTS, X-Frame-Options, etc.), add `zod` for server-side input validation, add rate limiting via Nuxt server middleware, fix OAuth cookie security attributes, sanitize error messages, and update Docker/database credentials to use environment variables.

**Tech Stack:** Nuxt 4, nuxt-security, zod, Lucia Auth, Drizzle ORM, PostgreSQL

**Precondition:** Create branch `feat/security-hardening` from current branch (`feat/postgres-migration`). Stash any outstanding changes before branching.

---

## Task 1: Create Branch and Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Stash any uncommitted changes and create the security hardening branch**

```bash
git stash
git checkout -b feat/security-hardening
```

- [ ] **Step 2: Install nuxt-security and zod**

```bash
npm install nuxt-security zod
```

- [ ] **Step 3: Verify installation**

Run: `npm ls nuxt-security zod`
Expected: Both packages listed without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add nuxt-security and zod dependencies"
```

---

## Task 2: Configure nuxt-security Headers and Middleware

**Files:**
- Modify: `nuxt.config.ts`

nuxt-security provides security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.) and basic rate limiting out of the box. We configure it with sensible defaults for a portfolio app.

- [ ] **Step 1: Update `nuxt.config.ts`**

```typescript
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-security'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    twitchClientId: process.env.TWITCH_CLIENT_ID,
    twitchClientSecret: process.env.TWITCH_CLIENT_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },
  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https://images.igdb.com', 'https://lh3.googleusercontent.com'],
        'font-src': ["'self'"],
        'connect-src': ["'self'", 'https://api.igdb.com', 'https://id.twitch.tv', 'https://openidconnect.googleapis.com'],
        'frame-ancestors': ["'none'"],
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubdomains: true,
      },
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
      },
    },
    rateLimiter: {
      tokensPerInterval: 20,
      interval: 'minute',
    },
  },
})
```

Notes:
- CSP `img-src` allows IGDB cover images (`images.igdb.com`) and Google avatars (`lh3.googleusercontent.com`)
- CSP `connect-src` allows Twitch token endpoint and Google userinfo (server-side fetches, but SSR may need these)
- `script-src` includes `'unsafe-inline'` and `'unsafe-eval'` because Nuxt/Vue dev tools and @nuxt/ui components need them. Can be tightened later in production.
- Rate limit: 20 requests per minute per IP (nuxt-security default)
- HSTS enabled for 1 year with subdomains (nuxt-security only applies these in production by default)

- [ ] **Step 2: Verify the app still builds**

Run: `npm run build`
Expected: Build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add nuxt.config.ts
git commit -m "feat: add nuxt-security with CSP, HSTS, rate limiting"
```

---

## Task 3: Add Zod Input Validation to Server Routes

**Files:**
- Create: `server/utils/validation.ts`
- Modify: `server/api/backlog/index.post.ts`
- Modify: `server/api/backlog/[id].patch.ts`
- Modify: `server/api/backlog/[id].delete.ts`
- Modify: `server/api/games/search.get.ts`
- Modify: `server/api/games/[id].get.ts`

- [ ] **Step 1: Create `server/utils/validation.ts`**

```typescript
import { z } from 'zod'

export const backlogCreateSchema = z.object({
  igdbGameId: z.number().int().positive(),
  status: z.enum(['playing', 'backlog', 'completed', 'dropped']).optional(),
})

export const backlogUpdateSchema = z.object({
  status: z.enum(['playing', 'backlog', 'completed', 'dropped']).optional(),
  rating: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
})

export const gameSearchQuerySchema = z.object({
  q: z.string().min(2).max(200),
  page: z.coerce.number().int().min(0).optional().default(0),
})

export const gameIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues.map(i => i.message).join(', '),
    })
  }
  return result.data
}

export function validateQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: result.error.issues.map(i => i.message).join(', '),
    })
  }
  return result.data
}
```

- [ ] **Step 2: Update `server/api/backlog/index.post.ts`**

```typescript
import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { eq } from 'drizzle-orm'
import { backlogCreateSchema, validateBody } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const body = await readBody(event)
  const data = validateBody(backlogCreateSchema, body)

  const existing = await db.query.backlogEntries.findFirst({
    where: (entries, { and }) => and(
      eq(entries.userId, user.id),
      eq(entries.igdbGameId, data.igdbGameId),
    ),
  })

  if (existing) {
    throw createError({ statusCode: 409, message: 'Game already in backlog' })
  }

  const [entry] = await db.insert(backlogEntries).values({
    userId: user.id,
    igdbGameId: data.igdbGameId,
    status: data.status || 'backlog',
  }).returning()

  return entry
})
```

- [ ] **Step 3: Update `server/api/backlog/[id].patch.ts`**

```typescript
import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { and, eq } from 'drizzle-orm'
import { backlogUpdateSchema, validateBody, gameIdParamSchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const { id } = gameIdParamSchema.parse({ id: getRouterParam(event, 'id') })
  const body = await readBody(event)
  const data = validateBody(backlogUpdateSchema, body)

  const entry = await db.query.backlogEntries.findFirst({
    where: and(
      eq(backlogEntries.id, id),
      eq(backlogEntries.userId, user.id),
    ),
  })

  if (!entry) {
    throw createError({ statusCode: 404, message: 'Entry not found' })
  }

  const [updated] = await db.update(backlogEntries)
    .set({
      status: data.status ?? entry.status,
      rating: data.rating !== undefined ? data.rating : entry.rating,
      notes: data.notes !== undefined ? data.notes : entry.notes,
      updatedAt: new Date(),
    })
    .where(eq(backlogEntries.id, id))
    .returning()

  return updated
})
```

- [ ] **Step 4: Update `server/api/backlog/[id].delete.ts`**

```typescript
import { requireAuth } from '#server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { and, eq } from 'drizzle-orm'
import { gameIdParamSchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const { id } = gameIdParamSchema.parse({ id: getRouterParam(event, 'id') })

  const entry = await db.query.backlogEntries.findFirst({
    where: and(
      eq(backlogEntries.id, id),
      eq(backlogEntries.userId, user.id),
    ),
  })

  if (!entry) {
    throw createError({ statusCode: 404, message: 'Entry not found' })
  }

  await db.delete(backlogEntries).where(eq(backlogEntries.id, id))

  return { success: true }
})
```

- [ ] **Step 5: Update `server/api/games/search.get.ts`**

```typescript
import { searchGames } from '~/services/igdb'
import { requireAuth } from '#server/utils/auth'
import { gameSearchQuerySchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const { q, page } = gameSearchQuerySchema.parse(query)

  const config = useRuntimeConfig(event)
  const limit = 20
  const offset = page * limit

  const games = await searchGames(q, config.twitchClientId, config.twitchClientSecret, limit, offset)
  return games
})
```

- [ ] **Step 6: Update `server/api/games/[id].get.ts`**

```typescript
import { getGameById } from '~/services/igdb'
import { requireAuth } from '#server/utils/auth'
import { gameIdParamSchema } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const { id } = gameIdParamSchema.parse({ id: getRouterParam(event, 'id') })

  const config = useRuntimeConfig(event)

  try {
    const game = await getGameById(id, config.twitchClientId, config.twitchClientSecret)
    return game
  } catch {
    throw createError({ statusCode: 404, message: 'Game not found' })
  }
})
```

- [ ] **Step 7: Verify the app still builds**

Run: `npm run build`
Expected: Build completes without errors.

- [ ] **Step 8: Commit**

```bash
git add server/utils/validation.ts server/api/backlog/ server/api/games/
git commit -m "feat: add zod input validation to all server routes"
```

---

## Task 4: Fix OAuth Cookie Security Attributes and Sanitize Error Messages

**Files:**
- Modify: `server/routes/auth/login.get.ts`
- Modify: `server/routes/auth/callback.get.ts`
- Modify: `server/routes/auth/logout.post.ts`

- [ ] **Step 1: Update `server/routes/auth/login.get.ts` — add sameSite to OAuth cookies**

```typescript
import { googleAuth } from '~/services/auth'
import { generateCodeVerifier, generateState } from 'arctic'

export default defineEventHandler(async (event) => {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()

  const url = googleAuth.createAuthorizationURL(state, codeVerifier, ['email', 'profile'])

  setCookie(event, 'google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })

  setCookie(event, 'google_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })

  return sendRedirect(event, url.toString())
})
```

- [ ] **Step 2: Update `server/routes/auth/callback.get.ts` — fix path and sanitize errors**

```typescript
import { lucia, googleAuth } from '~/services/auth'
import { db } from '~/services/db'
import { users } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { generateIdFromEntropySize } from 'lucia'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const state = query.state as string
  const code = query.code as string

  const storedState = getCookie(event, 'google_oauth_state')
  const codeVerifier = getCookie(event, 'google_code_verifier')

  if (!state || !code || !storedState || state !== storedState || !codeVerifier) {
    throw createError({ statusCode: 400, message: 'Invalid OAuth state. Please try logging in again.' })
  }

  try {
    const tokens = await googleAuth.validateAuthorizationCode(code, codeVerifier)
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    })
    const googleUser = await response.json()

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email),
    })

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)
      setCookie(event, sessionCookie.name, sessionCookie.value, {
        path: '/',
        ...sessionCookie.attributes,
      })
      return sendRedirect(event, '/dashboard')
    }

    const userId = generateIdFromEntropySize(10)
    await db.insert(users).values({
      id: userId,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
    })

    const session = await lucia.createSession(userId, {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    setCookie(event, sessionCookie.name, sessionCookie.value, {
      path: '/',
      ...sessionCookie.attributes,
    })

    return sendRedirect(event, '/dashboard')
  } catch (e) {
    console.error('Auth callback error:', e)
    throw createError({ statusCode: 500, message: 'Authentication failed. Please try again.' })
  }
})
```

Key changes:
- Changed `path: '.'` to `path: '/'` for session cookies (matches cookie spec better, more standard)
- Removed `e.message` from the error response — now returns generic message to client while still logging to console
- Simplified state mismatch error message to not reveal the mechanism

- [ ] **Step 3: Update `server/routes/auth/logout.post.ts` — fix path**

```typescript
import { lucia } from '~/services/auth'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, lucia.sessionCookieName)

  if (sessionId) {
    const { session } = await lucia.validateSession(sessionId)
    if (session) {
      await lucia.invalidateSession(session.id)
    }
  }

  const blankCookie = lucia.createBlankSessionCookie()
  setCookie(event, blankCookie.name, blankCookie.value, {
    path: '/',
    ...blankCookie.attributes,
  })

  return sendRedirect(event, '/')
})
```

- [ ] **Step 4: Verify app builds**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add server/routes/auth/
git commit -m "fix: add sameSite to OAuth cookies, sanitize error messages, fix cookie path"
```

---

## Task 5: Move Docker Compose Credentials to Environment Variables

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Update `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-backloggi}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-backloggi_dev}
      POSTGRES_DB: ${POSTGRES_DB:-backloggi}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Update `.env.example`**

```
DATABASE_URL="postgresql://backloggi:backloggi_dev@localhost:5432/backloggi"
TWITCH_CLIENT_ID=""
TWITCH_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NUXT_PUBLIC_APP_URL=""
POSTGRES_USER=backloggi
POSTGRES_PASSWORD=backloggi_dev
POSTGRES_DB=backloggi
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "fix: move docker-compose postgres credentials to env vars"
```

---

## Task 6: Add Centralized Auth Middleware

**Files:**
- Create: `app/middleware/auth.ts`
- Modify: `app/pages/dashboard.vue`
- Modify: `app/pages/backlog.vue`
- Modify: `app/pages/games/search.vue`
- Modify: `app/pages/games/[id].vue`

- [ ] **Step 1: Create `app/middleware/auth.ts`**

```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, fetchSession } = useAuth()

  if (!isAuthenticated.value) {
    await fetchSession()
  }

  if (!isAuthenticated.value) {
    return navigateTo('/', { redirectCode: 302 })
  }
})
```

- [ ] **Step 2: Update `app/pages/dashboard.vue`**

```vue
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { grouped, loading, fetchBacklog, addToBacklog } = useBacklog()
const { trendingGames, fetchTrending, loading: trendingLoading } = useGames()

onMounted(async () => {
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
    <div v-if="loading" class="text-center py-4 text-gray-500">Loading...</div>
    <div v-else-if="totalCount > 0" class="flex items-center gap-4 mb-6 text-sm text-gray-400 flex-wrap">
      <span><span class="text-green-400 font-medium">{{ grouped.playing.length }}</span> Playing</span>
      <span><span class="text-yellow-400 font-medium">{{ grouped.backlog.length }}</span> Backlog</span>
      <span><span class="text-blue-400 font-medium">{{ grouped.completed.length }}</span> Completed</span>
      <span><span class="text-red-400 font-medium">{{ grouped.dropped.length }}</span> Dropped</span>
      <NuxtLink to="/backlog" class="text-blue-400 hover:text-blue-300 ml-auto">
        View Backlog
      </NuxtLink>
    </div>
    <div v-else class="text-center py-4 mb-6">
      <span class="text-gray-500">Your backlog is empty</span>
      <NuxtLink to="/games/search" class="text-blue-400 hover:text-blue-300 ml-2">
        Browse Games
      </NuxtLink>
    </div>

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
```

- [ ] **Step 3: Update `app/pages/backlog.vue`**

```vue
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { grouped, loading, error, fetchBacklog, removeFromBacklog, updateEntry } = useBacklog()

onMounted(async () => {
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
```

- [ ] **Step 4: Update `app/pages/games/search.vue`**

```vue
<script setup lang="ts">
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
```

- [ ] **Step 5: Update `app/pages/games/[id].vue`**

```vue
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
```

- [ ] **Step 6: Verify app builds**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add app/middleware/ app/pages/
git commit -m "feat: add centralized auth middleware, remove manual auth checks from pages"
```

---

## Task 7: Add Auth Rate Limiting

**Files:**
- Create: `server/middleware/auth-rate-limit.ts`

nuxt-security provides basic rate limiting, but we need stricter limits specifically on auth endpoints to prevent brute-force attacks.

- [ ] **Step 1: Create `server/middleware/auth-rate-limit.ts`**

```typescript
import type { H3Event } from 'h3'

const authAttempts = new Map<string, { count: number; resetAt: number }>()
const AUTH_RATE_LIMIT = 10
const AUTH_RATE_WINDOW = 60 * 1000

function cleanupAuthRateLimit() {
  const now = Date.now()
  for (const [key, value] of authAttempts.entries()) {
    if (now > value.resetAt) {
      authAttempts.delete(key)
    }
  }
}

export default defineEventHandler(async (event: H3Event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  if (!path.startsWith('/auth/login') && !path.startsWith('/auth/callback')) {
    return
  }

  const ip = getRequestHeader(event, 'x-forwarded-for')
    || getRequestHeader(event, 'x-real-ip')
    || event.node.req.socket.remoteAddress
    || 'unknown'

  cleanupAuthRateLimit()

  const record = authAttempts.get(ip)

  if (!record) {
    authAttempts.set(ip, { count: 1, resetAt: Date.now() + AUTH_RATE_WINDOW })
    return
  }

  if (Date.now() > record.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: Date.now() + AUTH_RATE_WINDOW })
    return
  }

  record.count++

  if (record.count > AUTH_RATE_LIMIT) {
    throw createError({
      statusCode: 429,
      message: 'Too many authentication attempts. Please try again later.',
    })
  }
})
```

This provides:
- 10 auth attempts per IP per minute
- Memory-based (fine for a single-server portfolio app)
- Automatic cleanup of stale entries
- X-Forwarded-For support for reverse proxy setups

- [ ] **Step 2: Verify app builds**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add server/middleware/auth-rate-limit.ts
git commit -m "feat: add auth endpoint rate limiting middleware"
```

---

## Task 8: Update Lucia Auth Configuration for Production Security

**Files:**
- Modify: `app/services/auth.ts`

Ensure Lucia session cookie attributes include `sameSite: 'lax'` and proper path.

- [ ] **Step 1: Update `app/services/auth.ts`**

```typescript
import { Lucia } from 'lucia'
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle'
import { Google } from 'arctic'
import { db } from './db'
import { users, sessions } from '~/db/schema'

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users)

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
    avatarUrl: attributes.avatarUrl,
  }),
})

export const googleAuth = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  `${process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
)

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      email: string
      name: string
      avatarUrl: string
    }
  }
}
```

Key changes:
- Added explicit `sameSite: 'lax'` to session cookie attributes
- Added explicit `path: '/'` to session cookie attributes
- These will propagate to all session cookie operations via Lucia's `createSessionCookie()`

- [ ] **Step 2: Verify app builds**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/services/auth.ts
git commit -m "feat: add sameSite and path to Lucia session cookie config"
```

---

## Task 9: Update IMPROVEMENTS.md and Final Verification

**Files:**
- Modify: `IMPROVEMENTS.md`

- [ ] **Step 1: Update IMPROVEMENTS.md**

```markdown
# Improvements & Technical Debt

## Security (Completed)

- [x] **Security Headers** — Added nuxt-security module with CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and rate limiting.
- [x] **Input Validation** — Added zod schemas to all server routes for type-safe request validation.
- [x] **OAuth Cookie Security** — Added sameSite=lax to all OAuth cookies.
- [x] **Error Message Sanitization** — Auth callback no longer leaks internal error messages.
- [x] **Auth Rate Limiting** — Added IP-based rate limiting on auth endpoints (10 req/min).
- [x] **Centralized Auth Middleware** — Replaced manual auth checks in pages with Nuxt route middleware.
- [x] **Session Cookie Attributes** — Added sameSite=lax and path=/ to Lucia session config.
- [x] **Docker Credentials** — Moved postgres credentials to env vars with safe defaults.

## Code Style & Tooling

- [ ] **ESLint / Prettier Setup** — Review and configure ESLint + Prettier for consistent code style across the project. Currently no linter is configured, leading to inconsistent formatting.

## UI/UX

- [ ] **Feedback & Loading States** — Improve system feedback across all pages. Add loading skeletons or spinners to avoid users falling into momentary empty states while data is being fetched (especially on dashboard and backlog pages).
- [ ] **Backlog Page UI** — Polish the backlog page layout. Currently too simple/raw — needs better visual hierarchy, status grouping cards, and overall design refinement.
```

- [ ] **Step 2: Final build verification**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add IMPROVEMENTS.md
git commit -m "docs: update improvements with completed security items"
```

---

## Summary of Changes

| Issue | Severity | Fix | Task |
|-------|----------|-----|------|
| No security headers (CSP, HSTS, etc.) | Critical | nuxt-security module with CSP config | Task 2 |
| No rate limiting | Critical | nuxt-security rateLimiter + custom auth rate limit | Tasks 2, 7 |
| Error messages leak internals | Critical | Sanitized auth callback error messages | Task 4 |
| OAuth cookies missing SameSite | Medium | Added `sameSite: 'lax'` to state/verifier cookies | Task 4 |
| Hardcoded Docker DB password | Medium | Moved to env vars with safe defaults | Task 5 |
| No input validation | Medium | Zod schemas on all server routes | Task 3 |
| Session cookie missing sameSite/path | Medium | Added to Lucia config | Task 8 |
| Manual auth checks in every page | Medium | Centralized auth middleware | Task 6 |