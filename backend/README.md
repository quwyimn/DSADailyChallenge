# DSA Daily Challenge — Backend

NestJS REST API backing the DSA Daily Challenge mobile app (React Native/Expo) and the
admin web panel (React/Vite). It is the single source of truth for the whole product:
it generates challenge content, computes correct answers, validates and grades every
submission, and computes streaks/badges/leaderboard. Clients (mobile, admin) never see
a correct answer before they submit.

## What this backend does

- Serves daily DSA challenges across five challenge types: `bubble_sort`, `linked_list`,
  `binary_search`, `stack_ops`, `queue_ops`.
- Auto-assigns which tasks are "today's tasks" (two independent mechanisms — see
  `LOGIC.md` for the full explanation of `RotationService` vs `AutoAssignService`).
- Grades submissions server-side via a data-driven challenge-strategy registry (no
  `if (type === ...)` branching in business logic).
- Tracks per-user streaks (consecutive GMT+7 days where every assigned task was
  attempted), awards badges, and computes a weekly (Mon–Sun, GMT+7) points leaderboard.
- Gives admins CRUD over classes, tasks, and daily assignments, plus a per-class weekly
  completion/points dashboard.

## Tech stack

- **NestJS 11** (Node + TypeScript)
- **PostgreSQL** via **Prisma 7** using the `@prisma/adapter-pg` driver adapter (Prisma 7
  removed the `url` field from `schema.prisma`'s `datasource` block — the connection
  string is wired in at runtime/CLI time instead, see "Database / Prisma migrations").
- JWT auth (`passport-jwt`), `helmet` for security headers, `@nestjs/throttler` for rate
  limiting, `@nestjs/schedule` for the daily-rotation cron job.

## Install and run locally

1. `npm install`
2. Create your local env file: copy `.env.example` → `.env.development` and fill in
   real values (see the table below). **Note:** this repo currently already ships a
   working `.env.development` pointed at a shared Supabase Postgres instance for local
   dev — treat its contents as a secret; don't paste them into chat, docs, or commits
   elsewhere.
3. Apply the database schema: `npx prisma migrate dev` (see "Database / Prisma
   migrations" below — if you're pointed at the shared dev database, check with the
   team before running migrations against it).
4. Start the server in watch mode: `npm run start:dev`. It listens on `PORT` (default
   `3000`) with every route mounted under `/api`.
5. Sanity check: `curl http://localhost:3000/api/health` → `{ "status": "ok", ... }`.

Other useful scripts (see `package.json`):

| Script | Purpose |
|---|---|
| `npm run start` | Start once, no watch. |
| `npm run start:debug` | Start in watch mode with the Node inspector attached. |
| `npm run build` | Compile to `dist/` via `nest build`. |
| `npm run lint` | ESLint with `--fix` over `src`, `test`. |
| `npm run format` | Prettier over `src`, `test`. |
| `npm run test` | Unit tests (Jest, anything matching `*.spec.ts` under `src`). |
| `npm run test:e2e` | End-to-end tests via `test/jest-e2e.json`. |
| `npm run test:cov` | Unit tests with coverage. |

## Environment variables (`.env.development`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. Read directly from `process.env` by `PrismaService` (via the `PrismaPg` driver adapter) and separately by `prisma.config.ts` for CLI commands (`migrate`, `studio`, etc.). |
| `JWT_SECRET` | Yes | HMAC secret used to sign and verify JWTs (`AuthService.signToken`, `JwtStrategy`). Generate one with `openssl rand -base64 48`. |
| `JWT_EXPIRES_IN` | No (default `7d`) | Token lifetime passed to `jwt.sign()`. |
| `PORT` | No (default `3000`) | HTTP port Nest listens on. |
| `NODE_ENV` | No (default `development`) | Selects which `.env.<NODE_ENV>` file is loaded (by both `ConfigModule` and `prisma.config.ts`), gates CORS behavior, and tunes Prisma log verbosity. |
| `CORS_ORIGINS` | Only in production | Comma-separated allow-list of origins. **Ignored in development** (dev mode allows `*`); in production, a missing/empty value disables all cross-origin requests. |

`AppModule`'s `ConfigModule.forRoot()` validates at boot time and throws immediately if
`DATABASE_URL` or `JWT_SECRET` is missing, so a misconfigured environment fails fast
instead of crashing on the first request.

## Database / Prisma migrations

- Schema lives at `prisma/schema.prisma`. Models: `Class`, `User`, `Task`,
  `DailyAssignment`, `TaskRotation`, `Submission`, `Streak`, `Badge`, `UserBadge`.
- Generated Prisma client output goes to `generated/prisma/` (git-ignored, regenerated
  automatically by `migrate dev`/`migrate deploy`, or manually via `npx prisma
  generate`).
- Create a new migration after editing the schema:
  ```bash
  npx prisma migrate dev --name <short-description>
  ```
- Apply existing migrations non-interactively (CI / production):
  ```bash
  npx prisma migrate deploy
  ```
- Inspect data locally: `npx prisma studio`.
- **Known quirk in migration history:** `prisma/migrations/20260613101544_add_is_scored`
  and `20260613101554_add_is_scored` are empty (each only captured a CLI log line, not
  actual SQL) — the real `ALTER TABLE ... ADD COLUMN "is_scored"` statement lives in the
  third migration in that batch, `20260613101603_add_is_scored`. They're harmless,
  already-applied no-ops; don't delete or edit applied migrations to "fix" this.

## Running in production

1. `npm run build` → compiles to `dist/`.
2. `npm run start:prod` → runs `node dist/main`.
3. Set `NODE_ENV=production` and a real `CORS_ORIGINS` value — production CORS is
   deny-by-default unless this is set.
4. Run `npx prisma migrate deploy` against the production database as part of any
   release that changes the schema.
5. Required env vars (`DATABASE_URL`, `JWT_SECRET`) must be set as platform environment
   variables rather than via a `.env` file (per `.env.example`'s own comment).

Per the project's overall architecture (see the repo-root `ARCHITECTURE.md`/`RULES.md`),
the intended deploy targets are **Render** for this backend and **Google Cloud SQL** for
Postgres — this README only covers what's local to running `backend/` itself.

## API base URL

Every route is mounted under a global prefix of **`/api`**
(`app.setGlobalPrefix('api')` in `src/main.ts`).

- Local: `http://localhost:3000/api`

## Available endpoint groups

| Group | Base path | Description |
|---|---|---|
| Health | `GET /api/health` | Unauthenticated liveness check. |
| Auth | `/api/auth` | Register, log in, `GET /me` — issues and validates JWTs. |
| Users | `/api/users` | `GET /me` profile for any logged-in user; admin-only list/lookup of all users. |
| Classes | `/api/classes` | CRUD for school classes; list is public (used by the registration class-picker), writes are admin-only. |
| Tasks | `/api/tasks` | CRUD for the task bank; reads need a logged-in user, writes need an admin and a config that passes the matching challenge strategy's validation. |
| Daily | `GET /api/daily` | Today's tasks grouped by subject for the logged-in user; auto-generates today's assignments first if needed. |
| Assignments | `/api/assignments` | Admin CRUD for which task is scheduled on which date, plus `POST /generate` to force-generate a date's schedule on demand. |
| Submissions | `/api/submissions` | Submit an attempt (server-graded, max 3 attempts/day/task), plus today's submissions and a points summary. |
| Streak | `GET /api/streak` | Current/longest streak and a 7-day completion history for the logged-in user. |
| Badges | `GET /api/badges` | Badges earned by the logged-in user. |
| Leaderboard | `GET /api/leaderboard` | Weekly (Mon–Sun, GMT+7) points leaderboard, scored best-of-3-attempts per task per day. |
| Stats | `GET /api/stats` | Admin-only per-class weekly completion rate and points totals. |

For a full file-by-file technical breakdown of how these endpoints are implemented and
how requests flow through the system, see **`LOGIC.md`**.
