# Deployment Setup Guide

One-time setup steps to deploy Backloggi to Vercel + Neon.

## Prerequisites

- GitHub account with access to the Backloggi repo
- A [Neon](https://neon.tech) account (free tier)
- A [Vercel](https://vercel.com) account (free tier)
- Google Cloud Console project with OAuth 2.0 credentials
- Twitch Developer account with IGDB API credentials

## 1. Create Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up / log in
2. Create a new project named `backloggi`
3. Select the region closest to your users
4. Copy the **pooled connection string** (ends with `-pooler`). It looks like:
   ```
   postgresql://backloggi:password@ep-xxx.us-east-2.aws.neon.tech/backloggi?sslmode=require
   ```
5. Save this as `DATABASE_URL` — you'll need it for Vercel env vars and local development

## 2. Run Database Migrations

From your local machine, push the schema to Neon:

```bash
DATABASE_URL="postgresql://backloggi:password@ep-xxx.us-east-2.aws.neon.tech/backloggi?sslmode=require" npm run db:push
```

Verify the tables were created in the Neon console.

## 3. Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign up / log in (use GitHub for easy integration)
2. Click "Add New Project" → Import the Backloggi GitHub repository
3. Vercel should auto-detect Nuxt — keep the default settings
4. **Do not deploy yet** — first configure environment variables

## 4. Configure Vercel Environment Variables

In the Vercel project dashboard → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `TWITCH_CLIENT_ID` | Twitch/IGDB client ID |
| `TWITCH_CLIENT_SECRET` | Twitch/IGDB client secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NUXT_PUBLIC_APP_URL` | `https://backloggi.vercel.app` |

## 5. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Find your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   - `https://backloggi.vercel.app/auth/callback`
4. Under "Authorized JavaScript origins", add:
   - `https://backloggi.vercel.app`

## 6. Deploy

1. In the Vercel dashboard, click "Deploy" or push to the `master` branch
2. Wait for the build to complete
3. Visit `https://backloggi.vercel.app` and test the full flow:
   - Login with Google
   - Search for a game
   - Add it to your backlog
   - View your backlog

## 7. Configure GitHub Actions (CI/CD)

After the first successful Vercel deployment:

1. Get your Vercel tokens:
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Log in
   vercel login

   # Link project (run in repo root)
   vercel link

   # Get org ID and project ID from .vercel/project.json
   cat .vercel/project.json
   ```

2. Create a Vercel token at [vercel.com/account/tokens](https://vercel.com/account/tokens)

3. Add GitHub secrets (repo → Settings → Secrets and variables → Actions):
   - `VERCEL_TOKEN` — the token from step 2
   - `VERCEL_ORG_ID` — from `.vercel/project.json`
   - `VERCEL_PROJECT_ID` — from `.vercel/project.json`

4. Push to master — GitHub Actions will now run tests and deploy automatically.

## 8. Local Development with Neon (Optional)

To develop locally against Neon instead of Docker:

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL` to your Neon connection string
3. Run `npm run dev`

The `docker-compose.yml` is still available for local PostgreSQL if preferred.