# Deployment Design: Backloggi on Vercel + Neon

## Overview

Deploy Backloggi (Nuxt 4 + PostgreSQL) as a production application using Vercel for the app runtime and Neon for the database. All work will be done on the `feat/deployment` branch.

## Architecture

```
User → Vercel (Nuxt SSR + API routes) → Neon (Postgres serverless)
                ↘ IGDB API (Twitch)
                ↘ Google OAuth
```

- **Vercel** hosts the Nuxt app as serverless functions. Free tier includes SSL, automatic `*.vercel.app` domain, and CI/CD on push.
- **Neon** hosts PostgreSQL with built-in connection pooling (required for serverless). Free tier: 0.5GB storage, 100 compute hours/month.
- **GitHub Actions** runs tests and deploys to Vercel on push to master.

## Code Changes

### Remove in-memory rate limiter

`server/middleware/auth-rate-limit.ts` uses an in-memory `Map` for rate limiting. This does not work in serverless environments where each request may run in a separate process. Remove it entirely for now (YAGNI — personal project with no traffic). If needed later, implement rate limiting via a database table.

### Add `start` script to package.json

The `start` script is missing. Add:

```json
"start": "node .output/server/index.mjs"
```

This is not directly used by Vercel (which uses its own runtime) but is needed for local production testing and follows Nuxt conventions.

### Environment variables

The same env vars currently in `.env.example` will be configured in the Vercel dashboard with production values:

| Variable | Production Value |
|---|---|
| `DATABASE_URL` | Neon connection string (pooled) |
| `TWITCH_CLIENT_ID` | Twitch/IGDB credentials |
| `TWITCH_CLIENT_SECRET` | Twitch/IGDB credentials |
| `GOOGLE_CLIENT_ID` | Google OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `NUXT_PUBLIC_APP_URL` | `https://backloggi.vercel.app` |

`NODE_ENV=production` is set automatically by Vercel. This is important because the auth code checks `process.env.NODE_ENV === 'production'` for secure cookie flags.

### Google OAuth callback URL

Add `https://backloggi.vercel.app/auth/callback` as an authorized redirect URI in the Google Cloud Console OAuth configuration.

## Infrastructure Setup

### Neon

1. Create a Neon account and project (free tier).
2. Create the `backloggi` database (or use the default).
3. Copy the pooled connection string (ends with `-pooler`).
4. Run migrations against Neon from local machine: `DATABASE_URL=<neon-url> npx drizzle-kit push`.

The `docker-compose.yml` for local PostgreSQL development remains unchanged and is not used in production.

### Vercel

1. Connect the GitHub repository to Vercel.
2. Vercel auto-detects Nuxt and configures the build.
3. Set all environment variables in the Vercel dashboard (Settings → Environment Variables).
4. Deployments happen automatically on push to master, plus via GitHub Actions for test gates.

### GitHub Actions

Workflow file: `.github/workflows/deploy.yml`

Triggers on push to `master`. Steps:

1. Checkout code
2. Setup Node.js 20
3. `npm ci`
4. Run tests (`npm run test:run`)
5. Build (`npm run build`)
6. Deploy to Vercel production (`vercel --prod --yes`)

Requires `VERCEL_TOKEN` and `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` as GitHub secrets.

## Implementation Order

1. Create `feat/deployment` branch
2. Remove in-memory rate limiter (`server/middleware/auth-rate-limit.ts`)
3. Add `start` script to `package.json`
4. Create `.github/workflows/deploy.yml`
5. Add `.vercel/` to `.gitignore`
6. Create Neon project and run migrations
7. Create Vercel project and configure env vars
8. Add production Google OAuth callback URL
9. Add GitHub secrets for CI/CD
10. Push to master and verify deployment
11. Test full flow: login → search games → add to backlog → view backlog

## Out of Scope

- Custom domain setup (deferred until domain is registered)
- CDN caching optimizations
- Monitoring / logging (e.g., Sentry, LogDrain)
- Database backups (Neon handles this on paid plans; free tier has point-in-time recovery)
- Performance tuning for serverless (e.g., switching from `pg` to `@neondatabase/serverless`)