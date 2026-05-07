# Backloggi MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-user gaming backlog tracker with Google auth, IGDB search, and full CRUD on user backlogs, backed by PostgreSQL and tested with Vitest.

**Architecture:** Nuxt 4 SSR with server routes as the backend. PostgreSQL via Drizzle ORM. Lucia Auth for Google OAuth. IGDB API proxied through server routes with Twitch credentials kept server-side.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, @nuxt/ui, Tailwind CSS 4, PostgreSQL, Drizzle ORM, Lucia Auth, Vitest

**Sprint Organization:** 4 sprints, each producing working, testable software. Each sprint builds on the previous.

---

## Sprint 1: Foundation — Database, Auth, Infrastructure

> **Goal:** PostgreSQL connected, Drizzle schema, Lucia + Google OAuth working. A user can sign in with Google and get a session.

### Task 1.1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add all Sprint 1+ dependencies**

Run in project root:
```bash
npm install drizzle-orm pg lucia oslo @node-rs/argon2 arctic @lucia-auth/adapter-drizzle dotenv
npm install -D drizzle-kit vitest @vitest/coverage-v8 @testing-library/vue jsdom @types/node @types/pg
```

- [ ] **Step 2: Verify installation**

Run: `npm ls drizzle-orm lucia drizzle-kit vitest`
Expected: All packages listed without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add drizzle, lucia, vitest dependencies"
```

### Task 1.2: Database Schema

**Files:**
- Create: `db/schema/index.ts`
- Create: `db/schema/users.ts`
- Create: `db/schema/sessions.ts`
- Create: `db/schema/backlogEntries.ts`
- Create: `drizzle.config.ts`
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

```
DATABASE_URL="file:./db/dev.db"
TWITCH_CLIENT_ID=""
TWITCH_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

- [ ] **Step 2: Create `drizzle.config.ts`**

```typescript
import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

- [ ] **Step 3: Create `db/schema/users.ts`**

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

- [ ] **Step 4: Create `db/schema/sessions.ts`**

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
})

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
```

- [ ] **Step 5: Create `db/schema/backlogEntries.ts`**

```typescript
import { pgTable, serial, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'

export const statusEnum = pgEnum('status', ['playing', 'backlog', 'completed', 'dropped'])

export const backlogEntries = pgTable('backlog_entries', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  igdbGameId: integer('igdb_game_id').notNull(),
  status: statusEnum('status').default('backlog').notNull(),
  rating: integer('rating'),
  notes: text('notes'),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type BacklogEntry = typeof backlogEntries.$inferSelect
export type NewBacklogEntry = typeof backlogEntries.$inferInsert
```

- [ ] **Step 6: Create `db/schema/index.ts` (barrel export)**

```typescript
export { users } from './users'
export { sessions } from './sessions'
export { backlogEntries, statusEnum } from './backlogEntries'
```

- [ ] **Step 7: Generate migration**

Run: `npx drizzle-kit generate`
Expected: Migration file created in `db/migrations/`

- [ ] **Step 8: Commit**

```bash
git add db/ drizzle.config.ts .env.example
git commit -m "feat: add drizzle schema with users, sessions, backlog_entries tables"
```

### Task 1.3: Database Client

**Files:**
- Create: `app/services/db.ts`

- [ ] **Step 1: Create database client**

```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from '~/db/schema'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })
export { users, sessions, backlogEntries } from '~/db/schema'
```

- [ ] **Step 2: Commit**

```bash
git add app/services/db.ts
git commit -m "feat: add database client with drizzle"
```

### Task 1.4: Lucia Auth Configuration

**Files:**
- Create: `app/services/auth.ts`

- [ ] **Step 1: Create Lucia auth service**

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

- [ ] **Step 2: Commit**

```bash
git add app/services/auth.ts
git commit -m "feat: configure lucia auth with google oauth"
```

### Task 1.5: Auth Server Routes

**Files:**
- Modify: `nuxt.config.ts`
- Create: `server/routes/auth/login.get.ts`
- Create: `server/routes/auth/callback.get.ts`
- Create: `server/routes/auth/logout.post.ts`
- Create: `server/utils/auth.ts`

- [ ] **Step 1: Update `nuxt.config.ts` to fix security issue (move secrets to private config)**

```typescript
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
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
})
```

- [ ] **Step 2: Create `server/utils/auth.ts` (shared auth helper)**

```typescript
import { lucia } from '~/services/auth'

export async function requireAuth(event: H3Event) {
  const sessionId = getCookie(event, lucia.sessionCookieName)
  if (!sessionId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { session, user } = await lucia.validateSession(sessionId)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  return { session, user }
}
```

- [ ] **Step 3: Create login route `server/routes/auth/login.get.ts`**

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
    maxAge: 60 * 10,
    path: '/',
  })

  setCookie(event, 'google_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  })

  return sendRedirect(event, url.toString())
})
```

- [ ] **Step 4: Create callback route `server/routes/auth/callback.get.ts`**

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
    throw createError({ statusCode: 400, message: 'Invalid OAuth state' })
  }

  try {
    const tokens = await googleAuth.validateAuthorizationCode(code, codeVerifier)
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })
    const googleUser = await response.json()

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email),
    })

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)
      setCookie(event, sessionCookie.name, sessionCookie.value, {
        path: '.',
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
      path: '.',
      ...sessionCookie.attributes,
    })

    return sendRedirect(event, '/dashboard')
  } catch (e) {
    console.error('Auth callback error:', e)
    throw createError({ statusCode: 500, message: 'Authentication failed' })
  }
})
```

- [ ] **Step 5: Create logout route `server/routes/auth/logout.post.ts`**

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
    path: '.',
    ...blankCookie.attributes,
  })

  return sendRedirect(event, '/')
})
```

- [ ] **Step 6: Commit**

```bash
git add server/ nuxt.config.ts
git commit -m "feat: add google oauth auth routes with lucia"
```

### Task 1.6: useAuth Composable

**Files:**
- Create: `app/composables/useAuth.ts`

- [ ] **Step 1: Create `useAuth` composable**

```typescript
import type { Session, User } from 'lucia'

export function useAuth() {
  const session = useState<Session | null>('auth-session', () => null)
  const user = useState<User | null>('auth-user', () => null)

  const isAuthenticated = computed(() => !!session.value)

  async function fetchSession() {
    try {
      const data = await $fetch('/api/auth/session')
      session.value = data.session
      user.value = data.user
    } catch {
      session.value = null
      user.value = null
    }
  }

  async function signOut() {
    await $fetch('/auth/logout', { method: 'POST' })
    session.value = null
    user.value = null
    await navigateTo('/')
  }

  return { session, user, isAuthenticated, fetchSession, signOut }
}
```

- [ ] **Step 2: Create session API route `server/api/auth/session.get.ts`**

```typescript
import { lucia } from '~/services/auth'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, lucia.sessionCookieName)
  if (!sessionId) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const { session, user } = await lucia.validateSession(sessionId)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  return { session, user }
})
```

- [ ] **Step 3: Commit**

```bash
git add app/composables/useAuth.ts server/api/auth/session.get.ts
git commit -m "feat: add useAuth composable and session endpoint"
```

### Task 1.7: Landing Page + Auth UI

**Files:**
- Modify: `app/app.vue`
- Modify: `app/pages/index.vue`
- Modify: `app/layouts/default.vue`

- [ ] **Step 1: Create `app/layouts/default.vue` with auth-aware navigation**

```vue
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
          <NuxtLink to="/dashboard" class="text-sm text-gray-400 hover:text-white transition">
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
```

- [ ] **Step 2: Simplify `app/app.vue`**

```vue
<script setup lang="ts">
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```

- [ ] **Step 3: Create landing page `app/pages/index.vue`**

```vue
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
```

- [ ] **Step 4: Remove old `app/components/TrendingGame.vue` (will be recreated)**

```bash
rm app/components/TrendingGame.vue
```

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add landing page with auth layout"
```

---

## Sprint 2: IGDB Integration — Twitch Token, Game Search, Details

> **Goal:** IGDB API working through server routes. Users can search games, view trending games, and see game details.

### Task 2.1: Twitch Token Service

**Files:**
- Create: `app/services/twitch.ts`
- Create: `app/services/igdb.ts`

- [ ] **Step 1: Create Twitch token service `app/services/twitch.ts`**

```typescript
interface TwitchTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getTwitchAppToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const config = useRuntimeConfig()

  const params = new URLSearchParams({
    client_id: config.twitchClientId,
    client_secret: config.twitchClientSecret,
    grant_type: 'client_credentials',
  })

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: params,
  })

  if (!response.ok) {
    throw new Error(`Twitch auth failed: ${response.statusText}`)
  }

  const data: TwitchTokenResponse = await response.json()

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }

  return cachedToken.token
}
```

- [ ] **Step 2: Create IGDB client `app/services/igdb.ts`**

```typescript
import { getTwitchAppToken } from './twitch'

const IGDB_BASE = 'https://api.igdb.com/v4'

async function igdbFetch<T>(endpoint: string, query: string): Promise<T> {
  const token = await getTwitchAppToken()
  const config = useRuntimeConfig()

  const response = await fetch(`${IGDB_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': config.twitchClientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: query,
  })

  if (!response.ok) {
    throw new Error(`IGDB API error: ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

export interface IgdbGame {
  id: number
  name: string
  cover?: { id: number; url: string }
  genres?: { id: number; name: string }[]
  releaseDates?: { y: number; date: number }[]
  rating?: number
  summary?: string
  platforms?: { id: number; name: string }[]
  totalRating?: number
}

export async function searchGames(query: string, limit = 20, offset = 0): Promise<IgdbGame[]> {
  const igdbQuery = `search "${query}"; fields id, name, cover.url, genres.name, releaseDates.date, rating, summary, platforms.name, totalRating; limit ${limit}; offset ${offset};`
  return igdbFetch<IgdbGame[]>('games', igdbQuery)
}

export async function getGameById(id: number): Promise<IgdbGame> {
  const igdbQuery = `where id = ${id}; fields id, name, cover.url, genres.name, releaseDates.date, rating, summary, platforms.name, totalRating;`
  const results = await igdbFetch<IgdbGame[]>('games', igdbQuery)
  if (results.length === 0) {
    throw new Error('Game not found')
  }
  return results[0]
}

export async function getTrendingGames(limit = 12): Promise<IgdbGame[]> {
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  const now = Math.floor(Date.now() / 1000)
  const igdbQuery = `where releaseDates.date > ${thirtyDaysAgo} & releaseDates.date < ${now}; sort totalRating desc; limit ${limit}; fields id, name, cover.url, genres.name, releaseDates.date, rating, summary, platforms.name, totalRating;`
  return igdbFetch<IgdbGame[]>('games', igdbQuery)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/services/twitch.ts app/services/igdb.ts
git commit -m "feat: add twitch token service and igdb client"
```

### Task 2.2: IGDB Server API Routes

**Files:**
- Create: `server/api/games/search.get.ts`
- Create: `server/api/games/[id].get.ts`
- Create: `server/api/games/trending.get.ts`

- [ ] **Step 1: Create search route `server/api/games/search.get.ts`**

```typescript
import { searchGames } from '~/services/igdb'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const q = (query.q as string)?.trim()

  if (!q || q.length < 2) {
    throw createError({ statusCode: 400, message: 'Search query must be at least 2 characters' })
  }

  const page = Number(query.page) || 0
  const limit = 20
  const offset = page * limit

  const games = await searchGames(q, limit, offset)
  return games
})
```

- [ ] **Step 2: Create game detail route `server/api/games/[id].get.ts`**

```typescript
import { getGameById } from '~/services/igdb'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = Number(getRouterParam(event, 'id'))

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid game ID' })
  }

  try {
    const game = await getGameById(id)
    return game
  } catch {
    throw createError({ statusCode: 404, message: 'Game not found' })
  }
})
```

- [ ] **Step 3: Create trending route `server/api/games/trending.get.ts`**

```typescript
import { getTrendingGames } from '~/services/igdb'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const games = await getTrendingGames()
  return games
})
```

- [ ] **Step 4: Commit**

```bash
git add server/api/games/
git commit -m "feat: add IGDB proxy API routes (search, details, trending)"
```

### Task 2.3: useGames Composable

**Files:**
- Create: `app/composables/useGames.ts`

- [ ] **Step 1: Create `useGames` composable**

```typescript
import type { IgdbGame } from '~/services/igdb'

export function useGames() {
  const searchResults = ref<IgdbGame[]>([])
  const trendingGames = ref<IgdbGame[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function searchGames(query: string, page = 0) {
    loading.value = true
    error.value = null
    try {
      searchResults.value = await $fetch<IgdbGame[]>('/api/games/search', {
        query: { q: query, page },
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Search failed'
    } finally {
      loading.value = false
    }
  }

  async function fetchTrending() {
    loading.value = true
    error.value = null
    try {
      trendingGames.value = await $fetch<IgdbGame[]>('/api/games/trending')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load trending games'
    } finally {
      loading.value = false
    }
  }

  async function fetchGameById(id: number) {
    loading.value = true
    error.value = null
    try {
      return await $fetch<IgdbGame>(`/api/games/${id}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load game'
      return null
    } finally {
      loading.value = false
    }
  }

  return { searchResults, trendingGames, loading, error, searchGames, fetchTrending, fetchGameById }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/composables/useGames.ts
git commit -m "feat: add useGames composable for IGDB data fetching"
```

### Task 2.4: GameCard Component

**Files:**
- Create: `app/components/GameCard.vue`

- [ ] **Step 1: Create `GameCard` component**

```vue
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
  if (!props.game.releaseDates?.length) return null
  return new Date(props.game.releaseDates[0].date * 1000).getFullYear()
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
```

- [ ] **Step 2: Commit**

```bash
git add app/components/GameCard.vue
git commit -m "feat: add GameCard component"
```

---

## Sprint 3: Backlog CRUD — Add, Remove, Update Games

> **Goal:** Full backlog management. Users can add/remove games, change status, add ratings and notes.

### Task 3.1: Backlog Server API Routes

**Files:**
- Create: `server/api/backlog/index.get.ts`
- Create: `server/api/backlog/index.post.ts`
- Create: `server/api/backlog/[id].patch.ts`
- Create: `server/api/backlog/[id].delete.ts`

- [ ] **Step 1: Create GET route `server/api/backlog/index.get.ts`**

```typescript
import { requireAuth } from '~/server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const entries = await db.query.backlogEntries.findMany({
    where: eq(backlogEntries.userId, user.id),
    orderBy: (entries, { desc }) => [desc(entries.updatedAt)],
  })

  return entries
})
```

- [ ] **Step 2: Create POST route `server/api/backlog/index.post.ts`**

```typescript
import { requireAuth } from '~/server/utils/auth'
import { db, backlogEntries } from '~/services/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const body = await readBody(event)

  if (!body.igdbGameId) {
    throw createError({ statusCode: 400, message: 'igdbGameId is required' })
  }

  const existing = await db.query.backlogEntries.findFirst({
    where: (entries, { and, eq }) => and(
      eq(entries.userId, user.id),
      eq(entries.igdbGameId, body.igdbGameId)
    ),
  })

  if (existing) {
    throw createError({ statusCode: 409, message: 'Game already in backlog' })
  }

  const [entry] = await db.insert(backlogEntries).values({
    userId: user.id,
    igdbGameId: body.igdbGameId,
    status: body.status || 'backlog',
  }).returning()

  return entry
})
```

- [ ] **Step 3: Create PATCH route `server/api/backlog/[id].patch.ts`**

```typescript
import { requireAuth } from '~/server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

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
      status: body.status ?? entry.status,
      rating: body.rating ?? entry.rating,
      notes: body.notes ?? entry.notes,
      updatedAt: new Date(),
    })
    .where(eq(backlogEntries.id, id))
    .returning()

  return updated
})
```

- [ ] **Step 4: Create DELETE route `server/api/backlog/[id].delete.ts`**

```typescript
import { requireAuth } from '~/server/utils/auth'
import { db, backlogEntries } from '~/services/db'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event)

  const id = Number(getRouterParam(event, 'id'))

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

- [ ] **Step 5: Commit**

```bash
git add server/api/backlog/
git commit -m "feat: add backlog CRUD API routes"
```

### Task 3.2: useBacklog Composable

**Files:**
- Create: `app/composables/useBacklog.ts`

- [ ] **Step 1: Create `useBacklog` composable**

```typescript
import type { BacklogEntry } from '~/db/schema/backlogEntries'

export type BacklogStatus = 'playing' | 'backlog' | 'completed' | 'dropped'

export function useBacklog() {
  const entries = ref<BacklogEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBacklog() {
    loading.value = true
    error.value = null
    try {
      entries.value = await $fetch<BacklogEntry[]>('/api/backlog')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load backlog'
    } finally {
      loading.value = false
    }
  }

  async function addToBacklog(igdbGameId: number, status?: BacklogStatus) {
    error.value = null
    try {
      const entry = await $fetch<BacklogEntry>('/api/backlog', {
        method: 'POST',
        body: { igdbGameId, status },
      })
      entries.value.unshift(entry)
      return entry
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add to backlog'
      throw e
    }
  }

  async function updateEntry(id: number, updates: { status?: BacklogStatus; rating?: number; notes?: string }) {
    error.value = null
    try {
      const updated = await $fetch<BacklogEntry>(`/api/backlog/${id}`, {
        method: 'PATCH',
        body: updates,
      })
      const index = entries.value.findIndex(e => e.id === id)
      if (index !== -1) {
        entries.value[index] = updated
      }
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update entry'
      throw e
    }
  }

  async function removeFromBacklog(id: number) {
    error.value = null
    try {
      await $fetch(`/api/backlog/${id}`, { method: 'DELETE' })
      entries.value = entries.value.filter(e => e.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove from backlog'
      throw e
    }
  }

  const grouped = computed(() => {
    const groups: Record<BacklogStatus, BacklogEntry[]> = {
      playing: [],
      backlog: [],
      completed: [],
      dropped: [],
    }
    for (const entry of entries.value) {
      groups[entry.status].push(entry)
    }
    return groups
  })

  return { entries, loading, error, grouped, fetchBacklog, addToBacklog, updateEntry, removeFromBacklog }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/composables/useBacklog.ts
git commit -m "feat: add useBacklog composable with CRUD operations"
```

### Task 3.3: Dashboard Page

**Files:**
- Create: `app/pages/dashboard.vue`
- Create: `app/components/BacklogList.vue`

- [ ] **Step 1: Create `BacklogList` component**

```vue
<script setup lang="ts">
import type { BacklogEntry } from '~/db/schema/backlogEntries'
import type { BacklogStatus } from '~/composables/useBacklog'

const props = defineProps<{
  status: BacklogStatus
  entries: BacklogEntry[]
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
        <div class="text-sm font-medium truncate">Game #{{ entry.igdbGameId }}</div>
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
```

- [ ] **Step 2: Create dashboard page `app/pages/dashboard.vue`**

```vue
<script setup lang="ts">
const { isAuthenticated } = useAuth()

onMounted(async () => {
  await useAuth().fetchSession()
  if (!isAuthenticated.value) {
    await navigateTo('/')
    return
  }
  await useBacklog().fetchBacklog()
})

const { grouped, loading, error } = useBacklog()

async function handleRemove(id: number) {
  await useBacklog().removeFromBacklog(id)
}

async function handleUpdate(id: number, updates: { status?: 'playing' | 'backlog' | 'completed' | 'dropped'; rating?: number; notes?: string }) {
  await useBacklog().updateEntry(id, updates)
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

- [ ] **Step 3: Commit**

```bash
git add app/pages/dashboard.vue app/components/BacklogList.vue
git commit -m "feat: add dashboard page with backlog list"
```

### Task 3.4: Search Page

**Files:**
- Create: `app/pages/games/search.vue`

- [ ] **Step 1: Create search page**

```vue
<script setup lang="ts">
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

- [ ] **Step 2: Commit**

```bash
git add app/pages/games/search.vue
git commit -m "feat: add game search page"
```

---

## Sprint 4: Game Detail Page + Testing

> **Goal:** Complete game detail page, add tests for all critical paths, polish UI.

### Task 4.1: Game Detail Page

**Files:**
- Create: `app/pages/games/[id].vue`

- [ ] **Step 1: Create game detail page**

```vue
<script setup lang="ts">
const route = useRoute()
const gameId = Number(route.params.id)

const { fetchGameById, loading: gameLoading, error: gameError } = useGames()
const { addToBacklog, removeFromBacklog, entries, fetchBacklog } = useBacklog()

const game = ref<Awaited<ReturnType<typeof fetchGameById>>>(null)
const existingEntry = computed(() => entries.value.find(e => e.igdbGameId === gameId))

const coverUrl = computed(() => {
  if (!game.value?.cover?.url) return null
  return `https:${game.value.cover.url.replace('t_thumb', 't_cover_big')}`
})

const releaseYear = computed(() => {
  if (!game.value?.releaseDates?.length) return null
  return new Date(game.value.releaseDates[0].date * 1000).getFullYear()
})

const genres = computed(() => game.value?.genres?.map(g => g.name).join(', ') || null)
const platforms = computed(() => game.value?.platforms?.map(p => p.name).join(', ') || null)

onMounted(async () => {
  await useAuth().fetchSession()
  if (!useAuth().isAuthenticated.value) {
    await navigateTo('/')
    return
  }
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
      </div>
      <div class="flex-1">
        <h1 class="text-3xl font-bold mb-2">{{ game.name }}</h1>
        <div class="flex flex-wrap gap-2 mb-4 text-sm text-gray-400">
          <span v-if="releaseYear">{{ releaseYear }}</span>
          <span v-if="genres">{{ genres }}</span>
          <span v-if="platforms">{{ platforms }}</span>
        </div>
        <p v-if="game.summary" class="text-gray-300 mb-6 leading-relaxed">{{ game.summary }}</p>
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

- [ ] **Step 2: Commit**

```bash
git add app/pages/games/[id].vue
git commit -m "feat: add game detail page"
```

### Task 4.2: Vitest Configuration

**Files:**
- Create: `vitest.config.ts`
- Create: `test/setup.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server/', 'app/services/', 'app/composables/'],
    },
  },
})
```

- [ ] **Step 2: Add test script to `package.json`**

Add to scripts in `package.json`:
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 3: Create `test/setup.ts`**

```typescript
import { vi } from 'vitest'

// Mock Nuxt auto-imports
vi.stubGlobal('defineEventHandler', (handler: Function) => handler)
vi.stubGlobal('getQuery', () => ({}))
vi.stubGlobal('getRouterParam', () => '')
vi.stubGlobal('readBody', () => ({}))
vi.stubGlobal('getCookie', () => null)
vi.stubGlobal('setCookie', () => {})
vi.stubGlobal('sendRedirect', () => {})
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => {
  const error = new Error(message)
  ;(error as any).statusCode = statusCode
  return error
})
```

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts test/setup.ts package.json
git commit -m "chore: add vitest configuration"
```

### Task 4.3: Integration Tests — Backlog API

**Files:**
- Create: `test/integration/backlog.test.ts`

- [ ] **Step 1: Create backlog integration test**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Backlog API', () => {
  describe('POST /api/backlog', () => {
    it('should require authentication', async () => {
      vi.doMock('~/server/utils/auth', () => ({
        requireAuth: vi.fn().mockRejectedValue(createError({ statusCode: 401, message: 'Unauthorized' })),
      }))

      const { default: handler } = await import('~/server/api/backlog/index.post')
      const mockEvent = {} as any

      await expect(handler(mockEvent)).rejects.toThrow('Unauthorized')
    })

    it('should require igdbGameId in body', async () => {
      const mockUser = { id: 'user_1', email: 'test@test.com' }
      const mockSession = { id: 'session_1' }

      vi.doMock('~/server/utils/auth', () => ({
        requireAuth: vi.fn().mockResolvedValue({ user: mockUser, session: mockSession }),
      }))
      vi.doMock('~/services/db', () => ({
        db: { query: { backlogEntries: { findFirst: vi.fn().mockResolvedValue(null) } } },
        backlogEntries: {},
      }))
      vi.doMock('h3', () => ({
        readBody: vi.fn().mockResolvedValue({}),
      }))

      const { default: handler } = await import('~/server/api/backlog/index.post')
      const mockEvent = {} as any

      await expect(handler(mockEvent)).rejects.toThrow('igdbGameId is required')
    })
  })

  describe('GET /api/backlog', () => {
    it('should return user backlog entries', async () => {
      const mockUser = { id: 'user_1', email: 'test@test.com' }
      const mockSession = { id: 'session_1' }
      const mockEntries = [
        { id: 1, userId: 'user_1', igdbGameId: 123, status: 'playing' },
      ]

      vi.doMock('~/server/utils/auth', () => ({
        requireAuth: vi.fn().mockResolvedValue({ user: mockUser, session: mockSession }),
      }))
      vi.doMock('~/services/db', () => ({
        db: { query: { backlogEntries: { findMany: vi.fn().mockResolvedValue(mockEntries) } } },
        backlogEntries: {},
      }))

      const { default: handler } = await import('~/server/api/backlog/index.get')
      const result = await handler({} as any)

      expect(result).toEqual(mockEntries)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test:run`
Expected: Tests pass (mocked)

- [ ] **Step 3: Commit**

```bash
git add test/integration/backlog.test.ts
git commit -m "test: add backlog API integration tests"
```

### Task 4.4: Integration Tests — IGDB Service

**Files:**
- Create: `test/unit/igdb.test.ts`

- [ ] **Step 1: Create IGDB service unit tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('IGDB Service', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('getTwitchAppToken', () => {
    it('should fetch and cache a token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      })

      vi.doMock('~/services/twitch', () => {
        const config = { twitchClientId: 'test_id', twitchClientSecret: 'test_secret' }
        vi.stubGlobal('useRuntimeConfig', () => config)

        let cachedToken: any = null

        async function getTwitchAppToken() {
          if (cachedToken && Date.now() < cachedToken.expiresAt) {
            return cachedToken.token
          }

          const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
              client_id: config.twitchClientId,
              client_secret: config.twitchClientSecret,
              grant_type: 'client_credentials',
            }),
          })

          const data = await response.json()
          cachedToken = {
            token: data.access_token,
            expiresAt: Date.now() + (data.expires_in - 60) * 1000,
          }
          return cachedToken.token
        }

        return { getTwitchAppToken, getCachedToken: () => cachedToken }
      })

      const { getTwitchAppToken, getCachedToken } = await import('~/services/twitch')
      const token = await getTwitchAppToken()

      expect(token).toBe('test_token')
      expect(getCachedToken()).not.toBeNull()
    })
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npm run test:run`
Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add test/unit/igdb.test.ts
git commit -m "test: add IGDB service unit tests"
```

### Task 4.5: Trending Games on Dashboard

**Files:**
- Modify: `app/pages/dashboard.vue`

- [ ] **Step 1: Update dashboard to include trending section**

Modify `app/pages/dashboard.vue` by updating the script and template sections. Here is the complete updated file:

```vue
<script setup lang="ts">
const { isAuthenticated } = useAuth()
const { grouped, loading, error } = useBacklog()
const { trendingGames, fetchTrending, loading: trendingLoading } = useGames()

onMounted(async () => {
  await useAuth().fetchSession()
  if (!isAuthenticated.value) {
    await navigateTo('/')
    return
  }
  await useBacklog().fetchBacklog()
  await fetchTrending()
})

async function handleRemove(id: number) {
  await useBacklog().removeFromBacklog(id)
}

async function handleUpdate(id: number, updates: { status?: 'playing' | 'backlog' | 'completed' | 'dropped'; rating?: number; notes?: string }) {
  await useBacklog().updateEntry(id, updates)
}

async function handleAdd(gameId: number) {
  try {
    await useBacklog().addToBacklog(gameId)
  } catch {
    // Error handled by composable
  }
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

    <!-- Trending Section -->
    <section v-if="!trendingLoading && trendingGames.length > 0" class="mb-8">
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

    <!-- Backlog Sections -->
    <div v-if="loading" class="text-center py-12 text-gray-500">Loading...</div>

    <div v-else-if="error" class="text-center py-12 text-red-400">{{ error }}</div>

    <div v-else-if="grouped.playing.length + grouped.backlog.length + grouped.completed.length + grouped.dropped.length === 0 && !trendingGames.length" class="text-center py-12">
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

- [ ] **Step 2: Commit**

```bash
git add app/pages/dashboard.vue
git commit -m "feat: add trending games section to dashboard"
```

---

## Post-Sprint: Polish (Optional)

After all sprints complete:

- Add loading skeletons for game cards
- Add pagination to search results
- Add notes/rating editing to game detail page
- Add responsive design improvements
- Configure ESLint + Prettier
- Add `.env` to `.gitignore`
- Set up CI for running tests on push
- Deploy configuration (Vercel/Railway)
