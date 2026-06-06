# Improvements & Technical Debt

## Security (Completed)

- [x] **Security Headers** — Added nuxt-security module with CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and rate limiting.
- [x] **Input Validation** — Added zod schemas to all server routes for type-safe request validation.
- [x] **OAuth Cookie Security** — Added sameSite=lax to all OAuth cookies (state, verifier, session).
- [x] **Error Message Sanitization** — Auth callback no longer leaks internal error messages to clients.
- [x] **Auth Rate Limiting** — Added IP-based rate limiting on auth endpoints (10 req/min).
- [x] **Centralized Auth Middleware** — Replaced manual auth checks in pages with Nuxt route middleware.
- [x] **Session Cookie Attributes** — Added sameSite=lax and path=/ to Lucia session cookie config.
- [x] **Docker Credentials** — Moved postgres credentials to env vars with safe defaults.

## Code Style & Tooling

- [ ] **ESLint / Prettier Setup** — Review and configure ESLint + Prettier for consistent code style across the project. Currently no linter is configured, leading to inconsistent formatting.

## UI/UX

- [ ] **Feedback & Loading States** — Improve system feedback across all pages. Add loading skeletons or spinners to avoid users falling into momentary empty states while data is being fetched (especially on dashboard and backlog pages).
- [ ] **Backlog Page UI** — Polish the backlog page layout. Currently too simple/raw — needs better visual hierarchy, status grouping cards, and overall design refinement.
