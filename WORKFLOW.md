# WORKFLOW.md — How to work on this project

> The process for implementing a feature, testing it, deploying, and validating.
> Progress is measured by complete flows shipped, not lines of code.

## Core principle: vertical slices

Build **one complete flow end-to-end** (mobile → API → DB → mobile) before starting the next. A login flow that actually runs against production is worth more than 20 screens with no backend. Never leave a half-wired feature to start another.

## Implementing a feature (the loop)

1. **Locate** — read `MAP.md` to find where the code goes. Read `RULES.md` and `ARCHITECTURE.md` if the feature touches architecture.
2. **Backend first** — model/migration (Prisma) → service (business logic) → controller (endpoint) → DTO validation → guard if protected. Backend owns all logic.
3. **Wire the client** — add the API call in `services/api.ts`, handle loading/error/retry, update the right Zustand slice.
4. **Render** — build/extend the UI or challenge renderer. Render-only; no logic.
5. **Run the full slice on a real iPhone** against the deployed API.
6. **Test the edge cases** for that slice (see checklist below).
7. **Record** any non-obvious decision or bug in `MEMORY.md`.

## Build order (follow this sequence — do not jump ahead)

### Week 1 (25–31 May) — Foundation
- Scaffold `backend/`, `mobile/`, `admin/`. Provision Google Cloud SQL. Prisma schema (8 tables) + migration.
- Folder structure per `MAP.md`. `.env.development`/`.env.production`, `EXPO_PUBLIC_API_URL`, CORS, request logging, global exception filter.
- Auth + RBAC: register (with class selection), login, JWT, role guard.
- Zustand slices; global API error handler; retry; token-expiry handling.
- Define the challenge contract `{ type, config }`. CRUD for `tasks` and `classes`.
- **Deploy backend to Render + connect production the moment login works.** Verify CORS/env/auth/Prisma/HTTPS.
- ✅ **Slice done when:** on a real iPhone, register/login hits the production API, persists to Google Cloud SQL, and returns.

### Week 2 (1–7 Jun) — Core task loop
- `GET /daily` with GMT+7 date logic; backend generates challenge + precomputes the answer.
- `POST /submissions`: validate + score + store + reject duplicates.
- **Timezone edge tests immediately.**
- First 2D simulation: **Bubble Sort**, built as the first instance of the challenge contract.
- ✅ **Slice done when:** on iPhone — log in, see today's task, solve a full Bubble Sort, get scored.

### Week 3 (8–14 Jun) — Streak, leaderboard, admin
- Streak (all-tasks rule) + badges.
- Weekly leaderboard query.
- Full admin web: daily task list management, simulation content management, completion stats per class/grade (charts).
- Data lifecycle: leaderboard recomputed weekly; badges persisted once earned; submissions retained.
- ✅ **Slice done when:** admin creates a task; user sees streak + weekly leaderboard.

### Week 4 (15–25 Jun) — Hardening & report
- Second type: linked-list drag-and-drop (+ stack/queue only if ahead of schedule).
- **From mid-month: stop adding features.** Focus on stability, UX, bug-fixing, loading/retry polish.
- Full QA pass (checklist below). Mobile error boundary + crash logging.
- Tech docs + demo. **No 3D.**
- **24–25 Jun: buffer days** — no scheduled features.
- Hard deadline: **26 Jun 18:00.**

## Test checklist (run before calling any slice done)

Daily-system / timezone (critical):
- Submit at 23:59 GMT+7 vs reset at 00:00 GMT+7 — correct "day" assignment.
- Duplicate submission of the same task — scored only once.
- Day changes while a task screen is open.
- Leaderboard week rollover.

Auth & security:
- Token expiry mid-session → graceful re-auth, no crash.
- `user` cannot reach any `admin` endpoint.
- No password hash ever returned or logged.

Mobile resilience (on a real iPhone):
- Network drop mid-task → in-progress attempt recovered from `sessionStore`.
- App backgrounded then reopened mid-task → state restored.
- Reopen app after closing → still logged in (token persisted).
- Two devices, same account → consistent state.

## Deploy & validate

- Backend → Render; Admin → Vercel; DB → Google Cloud SQL.
- After every deploy, smoke-test the production URL from a real iPhone (HTTPS), not just localhost.
- Keep `.env.development` and `.env.production` separate; never commit secrets.
- Run Prisma migrations against the cloud DB as part of deploy, not manually-and-forgotten.

## Definition of done (whole project)

- All assignment hard requirements met (see `CLAUDE.md` / brief).
- Every weekly slice runs end-to-end on a real iPhone against production.
- Timezone edge cases pass.
- Stable, smooth iOS experience; graceful loading/retry/offline everywhere.
- Admin can author content and view per-class stats.
- No crash loses the user's session, in-progress task, or streak.

## Before you finish any session

- Update `MEMORY.md` with any decision/bug/debt.
- Leave no half-wired slice; if you must stop mid-slice, note exactly where in `MEMORY.md`.
