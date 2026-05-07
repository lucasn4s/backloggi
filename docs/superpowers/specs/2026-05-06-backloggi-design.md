# Backloggi - Gaming Backlog Tracker Design Spec

**Date**: 2026-05-06
**Status**: Draft

## Overview

Backloggi is a gaming backlog tracker that lets users search games via IGDB, add them to their personal backlog with status/rating/notes, and manage their game collection. Multi-user application with Google authentication.

## Architecture

### Stack

- **Frontend**: Nuxt 4 + Vue 3 + TypeScript + @nuxt/ui + Tailwind CSS 4
- **Backend**: Nuxt server routes
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Auth**: Lucia Auth (Google OAuth)
- **External API**: IGDB (via Twitch app credentials)
- **Testing**: Vitest + Vue Testing Library

### Directory Structure

```
app/
├── pages/
│   ├── index.vue              # Landing page (auth redirect or dashboard)
│   ├── dashboard.vue          # User's backlog overview
│   └── games/
│       ├── search.vue         # IGDB search & browse
│       └── [id].vue           # Game detail page
├── components/
│   ├── GameCard.vue           # Game card component
│   ├── BacklogList.vue        # Backlog grouped by status
│   ├── SearchBar.vue          # Game search input
│   └── TrendingGames.vue      # Trending games section
├── composables/
│   ├── useAuth.ts             # Auth state management
│   ├── useBacklog.ts          # Backlog CRUD operations
│   └── useGames.ts            # IGDB data fetching
├── server/
│   ├── api/
│   │   ├── games/
│   │   │   ├── search.get.ts      # Search IGDB
│   │   │   ├── [id].get.ts        # Get game details from IGDB
│   │   │   └── trending.get.ts    # Trending games
│   │   └── backlog/
│   │       ├── index.get.ts       # Get user's backlog
│   │       ├── index.post.ts      # Add game to backlog
│   │       ├── [id].patch.ts      # Update entry (status/rating/notes)
│   │       └── [id].delete.ts     # Remove from backlog
│   └── auth/
│       └── [...].ts               # Lucia auth endpoints (callback, login, logout)
├── services/
│   ├── db.ts                  # Drizzle client
│   ├── auth.ts                # Lucia auth configuration
│   ├── igdb.ts                # IGDB API client
│   └── twitch.ts              # Twitch token management
└── types/
    ├── game.ts                # IGDB game interfaces
    ├── backlog.ts             # Backlog entry types
    └── user.ts                # User/session types

db/
├── schema/                    # Drizzle schema definitions
└── migrations/                # Generated migrations
```

## Data Flow

1. User signs in via Google → Lucia creates session → session cookie set
2. Frontend fetches from server API routes
3. Server routes validate auth via Lucia, query PostgreSQL via Drizzle, call IGDB API using Twitch app token
4. IGDB calls proxied through server to keep Twitch credentials secure
5. All protected routes require valid session

## Authentication

- Google OAuth via Lucia Auth
- Standard session-based auth with httpOnly cookies
- Protected server routes check `getSession()` before accessing user data
- Landing page redirects to dashboard if authenticated

## Database Schema

### users

| Column      | Type       | Constraints            |
|-------------|------------|------------------------|
| id          | text       | PK                     |
| email       | text       | UNIQUE, NOT NULL       |
| name        | text       |                        |
| avatar_url  | text       |                        |
| created_at  | timestamp  | DEFAULT NOW()          |

### sessions (Lucia standard)

| Column     | Type       | Constraints            |
|------------|------------|------------------------|
| id         | text       | PK                     |
| user_id    | text       | FK → users.id          |
| expires_at | timestamp  | NOT NULL               |

### backlog_entries

| Column      | Type       | Constraints            |
|-------------|------------|------------------------|
| id          | serial     | PK                     |
| user_id     | text       | FK → users.id          |
| igdb_game_id| integer    | NOT NULL               |
| status      | text       | enum: playing, backlog, completed, dropped. DEFAULT backlog |
| rating      | integer    | 1-10, nullable         |
| notes       | text       | nullable               |
| added_at    | timestamp  | DEFAULT NOW()          |
| updated_at  | timestamp  | DEFAULT NOW()          |

Games are not stored in the database — only user-specific references to IGDB game IDs.

## API Routes

### Auth
- `GET /auth/login` — Redirect to Google OAuth
- `GET /auth/callback` — Handle OAuth callback, create session
- `POST /auth/logout` — Destroy session

### Games (IGDB proxy)
- `GET /api/games/search?q=...&page=...` — Search IGDB, requires auth
- `GET /api/games/:id` — Get game details from IGDB, requires auth
- `GET /api/games/trending` — Get trending games from IGDB, requires auth

### Backlog
- `GET /api/backlog` — Get current user's backlog, requires auth
- `POST /api/backlog` — Add game to backlog, requires auth, body: `{ igdbGameId, status? }`
- `PATCH /api/backlog/:id` — Update entry status/rating/notes, requires auth
- `DELETE /api/backlog/:id` — Remove entry, requires auth

## IGDB Integration

- Twitch app credentials stored server-side only (via `runtimeConfig` non-public)
- Token refresh handled by `twitch.ts` service
- IGDB API calls use IGDB API v2 (GraphQL-like syntax)
- Rate limiting applied to search endpoints
- Results can be cached with Nuxt's `useFetch` caching

## UI Pages

### Landing (`/`)
- Clean hero section with app description
- "Sign in with Google" button
- Redirects to `/dashboard` if already authenticated

### Dashboard (`/dashboard`)
- Shows user's backlog grouped by status
- Quick search bar
- Empty state when no games added
- Each game card shows cover, title, and current status

### Search (`/games/search`)
- Full-width search interface
- Results in grid layout with game cards
- "Add to backlog" button on each result
- Pagination or infinite scroll

### Game Detail (`/games/:id`)
- Large cover image
- Game info: description, genres, release date, rating, platforms
- User's backlog entry (if exists): status selector, rating, notes
- "Add to backlog" or "Remove from backlog" button

## Security

- Twitch credentials never exposed to client
- Session cookies: httpOnly, secure, sameSite
- All backlog routes require authentication
- IGDB API proxied through server routes
- Rate limiting on search API
- SQL injection prevented by Drizzle parameterized queries

## Testing Strategy

### Integration Tests (Priority 1)
- Server API endpoints: auth flow, backlog CRUD, IGDB proxy
- Mock IGDB responses
- Use testcontainers or transaction rollback for PostgreSQL isolation
- **Tool**: Vitest

### Unit Tests (Priority 2)
- Composables: `useAuth`, `useBacklog`, `useGames`
- Services: IGDB client, Twitch token manager
- **Tool**: Vitest

### Component Tests (Priority 3)
- `GameCard`, `BacklogList`, `SearchBar` — components with logic/interactions
- **Tool**: Vitest + Vue Testing Library

### E2E Tests
- Deferred until core flows are stable

## Deployment

- PostgreSQL: Neon, Railway, or Supabase (free tier)
- Nuxt SSR: Vercel, Railway, or any Node host
- Drizzle migrations: `drizzle-kit push` or CI-based migration
- Environment variables: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Future Considerations

- Movie support (TMDB integration)
- Additional OAuth providers (Discord, GitHub)
- Social features (shared wishlists, friend activity)
- E2E testing with Playwright
- Game import/export
- Statistics and playtime tracking
