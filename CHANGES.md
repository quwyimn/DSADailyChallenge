# CHANGES.md — Change log (AI must append here)

> **Mandatory:** whenever you (the AI) change anything non-trivial — add/remove a dependency,
> deviate from a rule, alter the data model, change an API contract, take a shortcut, or make
> any decision a human didn't explicitly ask for — you MUST append an entry here in the SAME
> change, before finishing. No silent changes. If you skip this, the change is incomplete.

## When to log (if in doubt, log)

- Added, removed, or upgraded a dependency.
- Changed the Prisma schema / data model.
- Changed an API endpoint's path, request, or response shape.
- Deviated from anything in `RULES.md` (must also include WHY + that you flagged it).
- Took a deliberate shortcut / introduced technical debt (also add to `MEMORY.md` debt log).
- Renamed/moved files or changed folder structure vs `MAP.md`.
- Any decision the developer did not explicitly request.

## What NOT to log here

- Routine implementation that follows the plan (that's just normal work).
- Pure bug fixes with no decision attached (those go in `MEMORY.md` bug journal).

## Entry format (copy this)

```
### [YYYY-MM-DD] Short title
- What: <what changed, concretely>
- Why: <reason>
- Scope: <files / modules affected>
- Rule impact: <none | deviates from RULES #N — flagged to developer>
- Follow-up: <none | what still needs doing / debt added to MEMORY.md>
```

---

## Log (newest first)

### [2026-06-07] Challenge contract wiring + Tasks CRUD
- What: (1) Extracted `ChallengeStrategy` interface to `challenge.interface.ts`; added `validateConfig` method to interface and `bubbleSortStrategy`. (2) Updated `challenge.registry.ts` with `isKnownType` + `listTypes` helpers; removed inline interface definition. (3) Created `ChallengeRegistryService` — injectable NestJS service wrapping the plain registry; registers `bubble_sort` in `onModuleInit` (explicit, not side-effect). (4) Created `@Global() ChallengesModule`. (5) Created full Tasks CRUD (`TasksModule`, `TasksService`, `TasksController`, `CreateTaskDto`, `UpdateTaskDto`). (6) Wired `ChallengesModule` + `TasksModule` into `app.module.ts`.
- Why: Challenge engine needed NestJS injection to be usable by TasksService (type validation on create/update). Tasks CRUD required for admin to author challenge content.
- Scope: `src/challenges/` (all files), `src/modules/tasks/` (all files), `src/app.module.ts`.
- Rule impact: none.
- Follow-up: none.

### [2026-06-07] DB provider updated — Supabase PostgreSQL (was Google Cloud SQL)
- What: `DATABASE_URL` env var now points to Supabase. No code changes — only the connection string in `.env.development` / `.env.production` changes. Prisma, schema, migrations, and `PrismaPg` adapter are identical.
- Why: Developer switched provider. Both are Postgres; Prisma is provider-agnostic.
- Scope: `.env.*` files only.
- Rule impact: none.
- Follow-up: Update MEMORY.md to remove stale Google Cloud SQL reference.

### [2026-06-07] Mobile auth slice — wire GET /auth/me, add authStore.setUser
- What: Added `authApi.me()` → `GET /auth/me` in `api.ts`. Added `setUser(user)` to `authStore`. Updated `HomeScreen` session restoration to call `authApi.me()` + `setUser()` (was `usersApi.me()` + `setAuth()` which re-wrote the token to SecureStore on every relaunch unnecessarily).
- Why: Task scope required "Connect to: GET /auth/me". The existing scaffolding used `/users/me` and called `persistToken()` redundantly during session restoration. `setUser()` completes the `setTokenOnly/setUser` bootstrap pair described in MEMORY.md.
- Scope: `mobile/src/services/api.ts`, `mobile/src/store/authStore.ts`, `mobile/src/screens/home/HomeScreen.tsx`.
- Rule impact: none.
- Follow-up: none.

### [2026-06-07] Backend — Add GET /auth/me to complete auth slice
- What: Added `GET /auth/me` handler to `AuthController`. Added `me(id)` method to `AuthService` (queries Prisma, returns `{id,email,name,role,classId,createdAt}`, no password hash).
- Why: Spec requires `GET /auth/me`. Pre-existing scaffolding only had `GET /users/me`.
- Scope: `backend/src/auth/auth.controller.ts`, `backend/src/auth/auth.service.ts`.
- Rule impact: none.
- Follow-up: none.

### [2026-05-27] Project document set created
- What: Created the AI-context document set (CLAUDE, MAP, RULES, ARCHITECTURE, MEMORY, WORKFLOW, PROJECT_BRAIN) and this change log.
- Why: Establish single source of truth before coding starts.
- Scope: repo root docs.
- Rule impact: none.
- Follow-up: none.