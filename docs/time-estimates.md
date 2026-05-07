# Backloggi - Time Estimates

**Last updated:** 2026-05-06

## Sprint Breakdown

| Sprint | Focus | Tasks | Estimate | Notes |
|---|---|---|---|---|
| **1** | Foundation (DB, Auth, Landing) | 7 | 45-60 min | Lucia + Google OAuth setup, Drizzle schema, landing page |
| **2** | IGDB Integration | 4 | 30-40 min | Twitch token, IGDB proxy, GameCard, search composable |
| **3** | Backlog CRUD | 4 | 35-45 min | Full backlog API, composable, dashboard, search page |
| **4** | Detail + Tests | 5 | 40-50 min | Game detail page, Vitest setup, integration/unit tests, trending |
| **Total** | | **20** | **~2.5-3h** | |

## Risk Buffer

Realistic estimate with debugging: **3-4 hours**

Known risk areas:
- **Lucia auth setup** — OAuth flows often need iteration (redirect URIs, cookie handling, session validation)
- **IGDB API** — GraphQL-like query syntax is finicky, may need field name adjustments
- **Drizzle + Nuxt** — auto-imports may conflict with server route imports
- **Dependency conflicts** — `@lucia-auth/adapter-drizzle` version compatibility with Drizzle

## Actual Time Tracking

| Sprint | Date | Actual Time | Notes |
|---|---|---|---|
| | | | |
