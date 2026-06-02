# Dashboard/Backlog Split — Implementation Plan

> **Goal:** Separate the current dashboard into two pages: `/dashboard` (trending + compact stats) and `/backlog` (full backlog management).

---

## Task 1: Refactor `app/pages/dashboard.vue`

**Changes:**
- Remove full backlog list (BacklogList components, remove/update handlers)
- Add inline stats bar with per-status counts + link to `/backlog`
- Remove "My Backlog" title (no title on dashboard)
- Keep trending games section as-is

## Task 2: Create `app/pages/backlog.vue`

**New file:** Migrate the full backlog view from the old dashboard here.
- Title "My Backlog"
- Link "+ Add Games" to `/games/search`
- Full backlog grouped by status using BacklogList

## Task 3: Update nav in `app/layouts/default.vue`

**Change:** "My Backlog" link from `/dashboard` → `/backlog`

## Task 4: Verify build

Run `npm run build` to confirm no errors.

## Files Changed

| File | Action |
|------|--------|
| `app/pages/dashboard.vue` | Refactor |
| `app/pages/backlog.vue` | Create |
| `app/layouts/default.vue` | Update nav link |
