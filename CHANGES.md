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

### [2026-06-09] Bubble Sort interactive challenge — Swap/No Swap UX, grade() updated, animation
- What: (1) Updated `bubbleSortStrategy.grade()`: actions format changed from `{step, array}` to `{step, didSwap: boolean}` — simpler check: `ua.didSwap === step.swapped` per step. Same `maxPoints` defaulting logic kept. (2) Removed `correctAnswer` from `SubmissionResult` in `api.ts` — server no longer returns it (server was already not returning it per user change to `submissions.service.ts`). (3) Rewrote `BubbleSortView` completely: `getStepPair(n, stepIndex)` mirrors the backend's nested loop exactly (outer i, inner j); two-button UI (Swap / No Swap) with animated bounce via `Animated.Value` + `useNativeDriver: true`; state-based feedback color (green = swap, slate = no-swap) clears after animation; workingArray updated immediately on predicted swap so each step shows the array in its latest predicted state; Submit button appears after all steps; 409 shown as "Already submitted today" and blocks further attempts; session result restored from `sessionStore.submissionResult` on mount (handles app-background-foreground mid-result).
- Why: Complete interactive Bubble Sort challenge flow required for Week 2.
- Scope: `backend/src/challenges/strategies/bubble-sort.strategy.ts`, `mobile/src/services/api.ts`, `mobile/src/components/challenges/BubbleSortView.tsx`.
- Rule impact: none.
- Follow-up: none.

### [2026-06-09] Submission flow — POST /submissions, GET /submissions/today, grade(), BubbleSortView
- What: (1) Extracted `getHcmToday()` private method from `DailyService` into `common/utils/hcm-date.ts`; added `getHcmDayUtcRange()` for UTC [start,end) window used in duplicate-check queries on Timestamptz fields. Updated `DailyService` to use the shared import. (2) Added `GradeResult` interface + `grade()` method to `ChallengeStrategy` interface. (3) Implemented `bubbleSortStrategy.grade()` — accepts `[{step,array}]` actions, compares each against `computeBubbleSortSteps()` output, returns `{isCorrect, points, correctAnswer}`; `points` defaults to 10 if `config.points` is absent. Does not touch existing `validateConfig`/`validate`/`computeAnswer`. (4) Created `SubmissionsModule` with `POST /api/submissions` (JWT, throttle 20/min) and `GET /api/submissions/today` (JWT). Service checks: task exists → assigned today (DATE equality) → duplicate today (Timestamptz range) → grade → persist → return with `correctAnswer`. (5) Added `SubmissionsModule` to `AppModule`. (6) Updated mobile: `SubmissionResult` type gains `correctAnswer: unknown`; `sessionStore` gains `submissionResult` + `setSubmissionResult`; `BubbleSortView` rebuilt as interactive — tap cells to swap, record each step, Submit button, result display (correct/incorrect, points, correct answer steps), 409 handled as "Already submitted today".
- Why: Submission vertical slice required for Week 2.
- Scope: `backend/src/common/utils/hcm-date.ts` (new), `backend/src/challenges/challenge.interface.ts`, `backend/src/challenges/strategies/bubble-sort.strategy.ts`, `backend/src/modules/daily/daily.service.ts`, `backend/src/modules/submissions/` (new, 4 files), `backend/src/app.module.ts`, `mobile/src/services/api.ts`, `mobile/src/store/sessionStore.ts`, `mobile/src/components/challenges/BubbleSortView.tsx`.
- Rule impact: none.
- Follow-up: none.

### [2026-06-09] Daily tasks feature — GET /daily, POST /assignments, HomeScreen task list
- What: (1) Created `modules/daily/` — `DailyService.getTodayTasks()` computes today's Asia/Ho_Chi_Minh calendar date (UTC+7 hardcoded, no DST in Vietnam), queries `daily_assignments` joined with `tasks`, returns `{ id, type, title, description, config }` per task — no answer field, no strategy invocation needed. (2) Created `modules/assignments/` — `AssignmentsService.create()` accepts `{ taskId, date }` (YYYY-MM-DD), stores the date as UTC midnight for the DATE field; duplicate (P2002) is caught by `GlobalExceptionFilter` → 409. Admin-only via `@Roles('admin')` + `RolesGuard`. (3) Wired `DailyModule` and `AssignmentsModule` into `app.module.ts`. (4) Updated `HomeScreen.tsx` — calls `dailyApi.getTodayTasks()` on mount via `useApi` hook, caches result in `cacheStore` with HCM date string, shows loading/error/empty/list states; retry button replays last fetch via `useApi.retry()`.
- Why: Required task — daily task loop vertical slice.
- Scope: `backend/src/modules/daily/` (new), `backend/src/modules/assignments/` (new), `backend/src/app.module.ts`, `mobile/src/screens/home/HomeScreen.tsx`.
- Rule impact: none.
- Follow-up: none.

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