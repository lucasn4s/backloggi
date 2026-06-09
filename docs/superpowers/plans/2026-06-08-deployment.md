# Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Backloggi to production on Vercel + Neon PostgreSQL with automated CI/CD via GitHub Actions.

**Architecture:** Nuxt 4 app runs on Vercel as serverless functions. Database is Neon PostgreSQL with built-in connection pooling. GitHub Actions runs tests and deploys on push to master. All work is done on the `feat/deployment` branch.

**Tech Stack:** Vercel, Neon PostgreSQL, GitHub Actions, Nuxt 4, Drizzle ORM

---

### Task 1: Remove in-memory auth rate limiter

The in-memory `Map`-based rate limiter doesn't work in serverless environments (each request may be a separate process). Remove it entirely for now — this is a personal project with minimal traffic.

**Files:**
- Delete: `server/middleware/auth-rate-limit.ts`
- Modify: `nuxt.config.ts:35-38` (remove `rateLimiter` config from nuxt-security)

- [ ] **Step 1: Delete the rate limiter middleware file**

```bash
rm server/middleware/auth-rate-limit.ts
```

- [ ] **Step 2: Remove nuxt-security rateLimiter config from nuxt.config.ts**

In `nuxt.config.ts`, remove the `rateLimiter` block from the `security` config. The result should look like:

```typescript
  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https://images.igdb.com', 'https://lh3.googleusercontent.com'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubdomains: true,
      },
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
    },
  },
```

- [ ] **Step 3: Run the build to verify nothing is broken**

```bash
npm run build
```

Expected: Build completes successfully with no errors.

- [ ] **Step 4: Run all tests to verify nothing is broken**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/auth-rate-limit.ts nuxt.config.ts
git commit -m "fix: remove in-memory rate limiter for serverless compatibility"
```

---

### Task 2: Add start script and update CSP for production

Add a `start` script for local production testing and update the Content Security Policy to allow the production Vercel domain.

**Files:**
- Modify: `package.json:6-14` (add `start` script)
- Modify: `nuxt.config.ts:18-26` (update CSP `connect-src` and `default-src` to include production URL)

- [ ] **Step 1: Add `start` script to package.json**

Add a `"start"` script after the `"build"` script in `package.json`:

```json
    "build": "nuxt build",
    "start": "node .output/server/index.mjs",
```

- [ ] **Step 2: Update CSP in nuxt.config.ts to allow production domain**

Update the `connect-src` directive in `nuxt.config.ts` to include the production app URL. The `default-src` and `connect-src` should allow both localhost and the Vercel domain:

```typescript
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https://images.igdb.com', 'https://lh3.googleusercontent.com'],
        'font-src': ["'self'"],
        'connect-src': ["'self'", 'https://backloggi.vercel.app'],
        'frame-ancestors': ["'none'"],
```

- [ ] **Step 3: Run the build to verify**

```bash
npm run build
```

Expected: Build completes successfully.

- [ ] **Step 4: Commit**

```bash
git add package.json nuxt.config.ts
git commit -m "feat: add start script and update CSP for production"
```

---

### Task 3: Add .vercel to .gitignore

Vercel creates a `.vercel/` directory locally when linked to a project. It should not be committed.

**Files:**
- Modify: `.gitignore` (add `.vercel` entry)

- [ ] **Step 1: Add `.vercel` to .gitignore**

Append to `.gitignore` after the `# OpenCode` section:

```
# Vercel
.vercel
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .vercel to gitignore"
```

---

### Task 4: Add database migration script to package.json

Add a `db:push` script to make it easy to push schema changes to the Neon database.

**Files:**
- Modify: `package.json` (add `db:push` script)

- [ ] **Step 1: Add `db:push` script to package.json**

Add after the `"test:coverage"` script:

```json
    "test:coverage": "vitest run --coverage",
    "db:push": "drizzle-kit push"
```

- [ ] **Step 2: Verify drizzle-kit is available**

```bash
npx drizzle-kit --version
```

Expected: Outputs version number (e.g., 0.31.x).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add db:push script for schema migrations"
```

---

### Task 5: Create GitHub Actions deploy workflow

Create the CI/CD pipeline that runs tests and deploys to Vercel on push to master.

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the deploy workflow file**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [master]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Build
        run: npm run build

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy to Vercel
        run: vercel deploy --prod --yes --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

- [ ] **Step 2: Verify the YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"
```

Expected: No output (valid YAML).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy workflow"
```

---

### Task 6: Add deployment setup guide

Create a step-by-step guide for the manual one-time setup tasks (creating Neon project, Vercel project, configuring env vars, etc.) that can't be automated in code.

**Files:**
- Create: `docs/deployment-setup.md`

- [ ] **Step 1: Create the deployment setup guide**

Create `docs/deployment-setup.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/deployment-setup.md
git commit -m "docs: add deployment setup guide"
```

---

### Task 7: Final verification

Run the build and all tests to make sure everything still works before merging.

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: Build completes successfully with no errors.

- [ ] **Step 3: Verify all changes on the branch**

```bash
git log --oneline feat/deployment
```

Expected: All commits from Tasks 1-6 are present.

- [ ] **Step 4: Merge into master**

```bash
git checkout master
git merge feat/deployment
git push origin master
```

After this, follow the steps in `docs/deployment-setup.md` to set up Neon, Vercel, and GitHub Actions.