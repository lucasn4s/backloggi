# Security Audit — Backloggi

> Auditado em 08/06/2026 — PR #3 (feat/deployment)

---

## CRITICAL — Deploy Blockers

### 1. IGDB Query Injection

**Arquivo:** `app/services/igdb.ts:38-39`

```typescript
const igdbQuery = `search "${query}"; fields id, name, cover.url, ...; limit ${limit}; offset ${offset};`
```

O input do usuário (`query`) é interpolado diretamente na string IGDB sem escape. Um attacker pode injetar comandos IGDB arbitrários:

```
q="; where id = 1; #
```

Resulta em: `search ""; where id = 1; #"; fields ...;`

**Fix:** Escapar `"` → `\"` e remover `;` e `#` do input, ou usar IGDB API com parameterized queries se disponível.

---

### 2. Sem Middleware Global de Autenticação

**Arquivo:** `server/middleware/` (diretório vazio)

Toda rota protegida chama `requireAuth(event)` manualmente. Se um dev esquecer de adicionar, a rota fica pública sem proteção nenhuma.

**Fix:** Criar `server/middleware/auth.ts` que protege globlamente as rotas `/api/` (excluindo as públicas como `/api/auth/session`).

---

### 3. Nuxt v4.3.1 com 3 CVEs

**Arquivo:** `package.json`

| CVE | Severidade | Descrição |
|-----|-----------|-----------|
| GHSA-fx6j-w5w5-h468 | Moderate | XSS em `navigateTo()` com redirect externo |
| GHSA-hg3f-28rg-4jxj | Moderate | Bypass de middleware via `__nuxt_island` |
| GHSA-g8wj-3cr3-6w7v | Low | Shared-cache poisoning em island endpoints |

**Fix:** `npm install nuxt@latest` (>= 4.4.6). Isso também resolve vulnerabilidades transitivas em `h3`, `nitropack`, `devalue` e `unhead`.

---

### 4. Lucia e Oslo Deprecated

**Arquivo:** `package.json`

- `lucia` v3.2.2 — Deprecated, sem patches futuros
- `@lucia-auth/adapter-drizzle` v1.1.0 — Deprecated
- `oslo` v1.2.1 — Deprecated, migrar para oslojs.dev

Sem patches de segurança futuros = risco crescente.

**Fix:** Planejar migração. Opções: oslojs.dev + custom auth, ou auth.js/next-auth pattern. Não é blocker imediato, mas precisa de roadmap.

---

## IMPORTANT — Corrigir Antes de Ir Live

### 5. Google OAuth Callback Sem Validação Zod

**Arquivo:** `server/routes/auth/callback.get.ts:24-46`

Dados do Google (`email`, `name`, `picture`) usados sem validação. Se a resposta for malformada, crash ou dado inválido no DB.

**Fix:**

```typescript
const googleUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().default(''),
  picture: z.string().url().nullable().optional(),
})
const googleUser = googleUserSchema.parse(await response.json())
```

---

### 6. OAuth Callback Usa `as string` Sem Validação

**Arquivo:** `server/routes/auth/callback.get.ts:9-10`

```typescript
const state = query.state as string
const code = query.code as string
```

Query strings tipo `?code=a&code=b` resultam em `string[]`, não `string`. O `as string` mascara o erro.

**Fix:**

```typescript
const { state, code } = z.object({
  state: z.string(),
  code: z.string(),
}).parse(query)
```

---

### 7. Erros de API Vazam Resposta de Terceiros

**Arquivos:** `app/services/twitch.ts:34`, `app/services/igdb.ts:20`

```typescript
throw new Error(`Twitch auth failed (${response.status}): ${body}`)
throw new Error(`IGDB API error (${response.status}): ${body}`)
```

Respostas do Twitch/IGDB podem conter info interna. Se não capturados chegando ao client = information disclosure.

**Fix:** Logar completo server-side, jogar erro genérico pro client:

```typescript
console.error('Twitch auth failed:', response.status, body)
throw createError({ statusCode: 502, message: 'External service unavailable' })
```

---

### 8. Rotas de API Sem try/catch

**6 arquivos** em `server/api/` sem error handling:

- `server/api/backlog/index.get.ts`
- `server/api/backlog/index.post.ts`
- `server/api/backlog/[id].patch.ts`
- `server/api/backlog/[id].delete.ts`
- `server/api/games/search.get.ts`
- `server/api/games/trending.get.ts`

Erros do Drizzle/DB podem vazar detalhes de schema nas mensagens de erro.

**Fix:** Wrap em try/catch com `createError({ statusCode: 500, message: 'Internal server error' })`.

---

### 9. Session API Expõe `session.id` Interna

**Arquivo:** `server/api/auth/session.get.ts:15`

```typescript
return { session, user }
```

O objeto `session` do Lucia inclui campos internos como `id` (identificador da sessão). O client só precisa saber se está autenticado + dados do user.

**Fix:** Retornar objeto sanitizado:

```typescript
return { user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } }
```

---

### 10. Sem Rate Limiting em Endpoints de Auth

**Arquivo:** `nuxt.config.ts`

O rate limiter in-memory foi removido (correto para serverless), mas nada o substituiu. Endpoints `/auth/login` e `/auth/callback` ficam desprotegidos contra brute force.

**Fix:** Implementar rate limiting serverless-friendly:
- Vercel Edge Middleware com `@vercel/edge-config` ou Upstash Redis
- Ou nuxt-security `rateLimiter` com store externo (Redis/Upstash)
- Ou rate limiting no nível do Vercel (vercel.json `rateLimit`)

---

### 11. `dotenv` em Dependencies

**Arquivo:** `package.json`

Nuxt já carrega `.env` nativamente. `dotenv` em production dependencies aumenta a superfície de ataque desnecessariamente.

**Fix:** Mover para `devDependencies` ou remover se não for usado diretamente.

---

### 12. Cookies OAuth Não Limpos Após Callback

**Arquivo:** `server/routes/auth/callback.get.ts`

Após o callback, `google_oauth_state` e `google_code_verifier` ficam no browser por 10 min (maxAge). Se roubados via XSS nesse intervalo, permitem replay.

**Fix:**

```typescript
deleteCookie(event, 'google_oauth_state', { path: '/' })
deleteCookie(event, 'google_code_verifier', { path: '/' })
```

---

## MINOR — Melhorias

### 13. `gameName` Sem Max Length

**Arquivo:** `server/utils/validation.ts:5`

```typescript
gameName: z.string().min(1),
```

**Fix:** Adicionar `.max(255).trim()`.

---

### 14. `gameCoverUrl` Sem Validação de URL

**Arquivo:** `server/utils/validation.ts:6`

```typescript
gameCoverUrl: z.string().nullable().optional(),
```

**Fix:** Trocar por `z.string().url().nullable().optional()` ou `z.string().regex(/^https:\/\/images\.igdb\.com\//).nullable().optional()`.

---

### 15. Devtools Habilitado Incondicionalmente

**Arquivo:** `nuxt.config.ts:4`

```typescript
devtools: { enabled: true },
```

**Fix:** `devtools: { enabled: process.env.NODE_ENV !== 'production' }`.

---

### 16. CSP Permite `unsafe-inline` + `unsafe-eval`

**Arquivo:** `nuxt.config.ts:19-20`

```typescript
'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
'style-src': ["'self'", "'unsafe-inline'"],
```

Necessário para Nuxt/Vue, mas enfraquece a proteção XSS. Considerar nonce-based CSP do nuxt-security quando possível.

---

### 17. Console.error com Objeto Completo em Auth Callback

**Arquivo:** `server/routes/auth/callback.get.ts:57`

```typescript
console.error('Auth callback error:', e)
```

Pode logar tokens OAuth em certos cenários.

**Fix:** `console.error('Auth callback error:', e instanceof Error ? e.message : 'Unknown error')`

---

### 18. Dependências Transitivas Vulneráveis

| Pacote | Severidade | CVE | Fix |
|--------|-----------|-----|-----|
| `node-forge` 1.3.3 | HIGH (4 CVEs) | Signature forgery, basicConstraints bypass, DoS | >= 1.4.0 |
| `simple-git` 3.32.3 | CRITICAL (9.8) | RCE | >= 3.36.0 |
| `devalue` 5.6.3 | HIGH (7.5) | DoS via sparse array | > 5.8.0 |
| `h3` 1.15.5 | MODERATE (4 CVEs) | SSE injection, path traversal | >= 1.15.9 |
| `js-cookie` 3.0.5 | HIGH (7.5) | Cookie-attribute injection | > 3.0.5 |
| `lodash` 4.17.23 | HIGH (8.1) | Code injection via `_.template` | No fix yet |
| `vite` 7.3.1 | HIGH (3 CVEs) | Path traversal, arbitrary file read, fs.deny bypass | > 7.3.1 |
| `nitropack` 2.13.1 | MODERATE | Open redirect, proxy scope bypass | >= 2.13.4 |

**Fix principal:** Upgrade `nuxt` para >= 4.4.6 resolve `h3`, `nitropack`, `devalue`, `unhead` e `vite`. Depois `npm audit fix` para o resto.

---

## Coisas que Estão Certas

- `.env` propriamente gitignored (nunca commitado)
- Secrets em `runtimeConfig` server-only (não em `public`)
- GitHub Actions usa `${{ secrets.* }}` corretamente
- Todas as rotas de backlog validam `userId` antes de CRUD
- PKCE implementado no OAuth flow
- OAuth state parameter validado contra cookie
- Erros retornados ao client são genéricos (emboa serviços twitch/igdb não sejam)
- Sem SQL injection (Drizzle ORM usa parameterized queries)
- Redirect hardcoded para `/dashboard` (sem open redirect)

---

## Plano de Execução

### Fase 1 — Crítico (Sem isso, não faz deploy)

- [x] Sanitizar input IGDB (escape `"` e `;`)
- [x] Criar `server/middleware/auth.ts` com proteção global
- [x] `npm install nuxt@latest` (resolve CVEs + transitivas)

### Fase 2 — Importante (Antes de ir live)

- [x] Validar dados Google OAuth com Zod no callback
- [x] Validar `query.state` e `query.code` com Zod no callback
- [x] Trocar `throw new Error` por `createError` genérico em twitch.ts e igdb.ts
- [x] Adicionar try/catch nas 6 rotas de API
- [x] Sanitizar resposta de `/api/auth/session` (remover `session.id`)
- [x] Deletar cookies OAuth após callback
- [x] Mover `dotenv` para devDependencies
- [x] Implementar rate limiting serverless-friendly (Upstash Redis)

### Fase 3 — Minor (Iteração seguinte)

- [ ] `.max(255).trim()` em `gameName`
- [ ] `.url()` em `gameCoverUrl`
- [ ] Devtools condicional
- [ ] Melhorar CSP (remover `unsafe-eval` se possível)
- [ ] Logar só mensagem de erro em auth callback
- [ ] Planejar migração de `lucia` → alternativa ativa
- [ ] `npm audit fix` + overrides para transitivas restantes