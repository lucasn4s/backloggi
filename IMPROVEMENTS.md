# Improvements & Technical Debt

## Security (Completed)

- [x] **Security Headers** — Added nuxt-security module with CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
- [x] **Input Validation** — Added zod schemas to all server routes for type-safe request validation.
- [x] **OAuth Cookie Security** — Added sameSite=lax to all OAuth cookies (state, verifier, session).
- [x] **Error Message Sanitization** — Auth callback no longer leaks internal error messages to clients.
- [x] **Auth Rate Limiting** — Added IP-based rate limiting on auth endpoints (10 req/min) via Upstash Redis (serverless-friendly). In-memory limiter removed (incompatible with serverless).
- [x] **Centralized Auth Middleware** — Replaced manual auth checks in pages with Nuxt route middleware.
- [x] **Session Cookie Attributes** — Added sameSite=lax and path=/ to Lucia session cookie config.
- [x] **Docker Credentials** — Moved postgres credentials to env vars with safe defaults.

## Security (Fase 2 do audit — deploy)

- [x] **Zod no Google OAuth callback** — `googleOAuthQuerySchema` (state/code) e `googleUserSchema` (email/name/picture) validam inputs do OAuth. Queries malformadas (`?code=a&code=b`) não mascaram mais erros.
- [x] **Erros genéricos em twitch/igdb** — Serviços externos logam detalhes server-side e retornam `502 External service unavailable` pro client (sem vazar resposta de terceiros).
- [x] **try/catch nas rotas de API** — 6 rotas (`backlog/index.get`, `index.post`, `[id].patch`, `[id].delete`, `games/search.get`, `games/trending.get`) convertem erros inesperados do DB/IGDB em `500 Internal server error`; erros esperados (404/409) passam intactos.
- [x] **Session API sanitizada** — `/api/auth/session` retorna apenas `{ user: { id, email, name, avatarUrl } }`, sem expor `session.id` interno. Client `useAuth` consome o novo shape.
- [x] **Cookies OAuth limpos** — `google_oauth_state` e `google_code_verifier` deletados após o callback.
- [x] **`dotenv` movido para devDependencies** — usado apenas pelo `drizzle.config.ts`.
- [x] **Rate limiting Upstash** — novo `server/middleware/rateLimit.ts` protege `/auth/login` e `/auth/callback` (10 req/min por IP). Fail-open se env vars não configuradas (dev). Env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Code Style & Tooling

- [ ] **ESLint / Prettier Setup** — Review and configure ESLint + Prettier for consistent code style across the project. Currently no linter is configured, leading to inconsistent formatting.

## UI/UX

- [ ] **Feedback & Loading States** — Improve system feedback across all pages. Add loading skeletons or spinners to avoid users falling into momentary empty states while data is being fetched (especially on dashboard and backlog pages).
- [ ] **Backlog Page UI** — Polish the backlog page layout. Currently too simple/raw — needs better visual hierarchy, status grouping cards, and overall design refinement.
