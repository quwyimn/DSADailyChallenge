# MEMORY.md — Long-term project memory

> Past decisions, known gotchas, technical debt, and lessons. Update this whenever a
> non-obvious decision is made or a bug teaches something. This is how future sessions
> (human or AI) avoid repeating mistakes.

## How to use this file

- Before solving a problem, scan here — it may already be answered.
- After making a non-obvious decision or fixing a tricky bug, add an entry.
- Keep entries short: what + why. Newest at the top of each section.

---

## Decisions already made (and why)

- **Prisma 7 `prisma-client-js` provider (not new `prisma-client`).** Prisma 7 ships a new TypeScript-first client (`prisma-client` provider) that generates ESM-only `.ts` files using `import.meta.url`. NestJS runs CommonJS, making them incompatible at build time. The legacy `prisma-client-js` provider (still fully supported in Prisma 7) generates to `node_modules/@prisma/client` as CJS and works cleanly with NestJS.
- **`@nestjs/jwt` 11 — `expiresIn` set at sign-time, not in module config.** `JwtModuleOptions.signOptions.expiresIn` now requires branded `StringValue | number`, not plain `string`. To avoid a `// @ts-expect-error` hack, `expiresIn` is passed directly in `jwt.sign()` inside `AuthService`, where the cast is isolated to one line.
- **Phase 4 mobile foundation complete (2026-05-27).** Navigation: React Navigation v7 kept (not Expo Router — switching would require complete file restructure with no benefit). `RootStackParamList` now covers all 6 routes. `SafeAreaProvider` wraps the whole tree. 401 handler registered at module level in `App.tsx` via `registerUnauthorizedHandler` to break circular dep (`api.ts` → `errorHandler.ts` → `authStore.ts`). `authStore` has `setTokenOnly` for bootstrap (avoids re-writing an already-persisted token). `useApi` hook: imperative form with `execute(fn)` + `retry()` backed by `useRef`. All 6 screens wired. 3 common components (ScreenWrapper, LoadingOverlay, ErrorBanner). All endpoint functions typed in `api.ts`.
- **Phase 3 database setup complete (2026-05-27).** Schema finalised: `Role` enum, `@db.Timestamptz` on all DateTime fields, correct composite indexes on Submission. Prisma 7 forbids `url` in `datasource` block — URL lives in `prisma.config.ts` only. Migration applied to Supabase (as of 2026-06-07, DB is working and tested per developer). Run `npx prisma migrate deploy` (not `db push`) for any future schema changes.
- **Phase 2 backend foundation complete (2026-05-27).** Env files renamed to `.env.development` / `.env.production`. `ConfigModule` loads by `NODE_ENV`, validates `DATABASE_URL`+`JWT_SECRET` on boot. `CORS_ORIGINS` env var added (comma-separated). `GlobalExceptionFilter` upgraded: Logger, Prisma P2002→409 / P2025→404, stack trace on 5xx. `RequestLoggingInterceptor` logs status code. `PrismaService` logs queries in dev, warns on >200 ms. `AuthService` uses `ConfigService` for `JWT_EXPIRES_IN`. `prisma.config.ts` reads env file by `NODE_ENV`.
- **Challenge contract + Tasks CRUD complete (2026-06-07).** `ChallengeStrategy` interface in `challenge.interface.ts` — four methods: `generateConfig`, `validateConfig`, `computeAnswer`, `validate`. Registry is a module-level `Map` (`challenge.registry.ts`) with `isKnownType`/`listTypes` helpers. `ChallengeRegistryService` is `@Injectable()` + `@Global()` (similar to PrismaModule); registers strategies in `onModuleInit`, NOT via file side-effects. `bubble_sort` registered there. `TasksService` calls `assertKnownType` + `assertValidConfig` before any write — enforces RULES.md rule 15. `Prisma.InputJsonValue` cast required when passing `Record<string, unknown>` to `prisma.task.create/update` — cast isolated to one line in service. Classes CRUD was already complete (no changes needed).
- **DB provider changed to Supabase PostgreSQL (2026-06-07).** Was Google Cloud SQL. Code is identical — only `DATABASE_URL` env var changes. Prisma, schema, and adapter are provider-agnostic. Update `.env.development` + `.env.production` with Supabase connection strings.
- **Mobile auth slice complete (2026-06-07).** All three auth endpoints connected: `POST /auth/login`, `POST /auth/register`, `GET /auth/me` (via `authApi.me()`). `authStore` has a `setUser(user)` method for session restoration that does NOT re-write the token to SecureStore (pairs with `setTokenOnly` from bootstrap). `HomeScreen` uses `authApi.me()` + `setUser()` — not `setAuth()` — during relaunch restoration. TypeScript: clean. Navigation: token-gated (auth stack vs main stack in App.tsx). 401 → logout wired at module level.
- **Auth slice complete (2026-06-07).** `GET /api/auth/me` added to AuthController/AuthService — the only missing endpoint from the auth scope. All three auth endpoints are now live: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`. Build is clean. RBAC guards, JWT strategy, DTOs, throttling, and Prisma schema were already in place from Phase 1.
- **`import type` required for decorated signatures.** When `isolatedModules: true` and `emitDecoratorMetadata: true` are both set (NestJS default), any type used in a `@Decorator()` method parameter annotation must be imported with `import type`, not a regular value import. Pattern: `import { Decorator } from '...'; import type { TheType } from '...'` on separate lines. Already used in `users.controller.ts`; now also in `auth.controller.ts`.
- **Phase 1 scaffolding complete (2026-05-27).** All three projects scaffold and compile: `backend/` (NestJS + Prisma + Auth), `mobile/` (Expo + Zustand + Navigation), `admin/` (React + Vite). Full auth endpoints and Prisma schema (8 tables) are in place. Challenge engine registry + bubble_sort strategy are scaffolded. Week 2 task: wire `GET /daily`, `POST /submissions`, and the interactive Bubble Sort view.

- **DB = PostgreSQL on Supabase** (switched from Google Cloud SQL on 2026-06-07). Prisma, schema, and migrations are unchanged — provider-agnostic. Update `DATABASE_URL` in `.env.*` files to Supabase connection strings.
- **Backend = NestJS** (not plain Express, not ASP.NET). Same language as mobile (TS) for a solo dev; built-in guards make RBAC clean.
- **Admin = separate React web app**, not inside the RN app. Admin needs big tables, forms, and charts that belong on a desktop browser.
- **Mobile state = Zustand**, not Redux/Context. Lightweight, less boilerplate for one developer.
- **Streak rule = complete ALL of today's tasks** (decided by the manager), which is stricter than "at least one". To keep it achievable, the **daily task count is capped small (default 3)**.
- **Class/grade = chosen by the user at registration** (decided by the manager).
- **Simulations = 2D for everything. 3D was explicitly dropped.** It was considered (the manager was keen) but rejected: DS&A are inherently 2D, 3D doesn't aid learning, and it would consume the limited time budget. Possible future "showcase" only, never core.
- **Leaderboard = computed by query, not stored.** Avoids a second source of truth.
- **Deploy in week 1**, not at the end — to surface production-only issues early.

## Known gotchas / things proven to bite (watch for these)

- **Timezone is the #1 risk.** Store UTC, convert to GMT+7 only at the edges. The classic bugs: streak computed against the wrong "day", reset boundary off by the GMT+7 offset, leaderboard week rollover wrong. Test 23:59→00:00 early.
- **iOS blocks plain HTTP** — the production API must be HTTPS or the app silently fails to connect. (This is partly why we deploy early.)
- **iOS app suspension** — the user can background the app mid-task and return; the session store must restore the in-progress attempt or the user loses work.
- **Production ≠ local** in: CORS config, env vars, auth over HTTPS, Prisma→cloud-DB connection, timezone. These don't show up until deployed.
- **Drag-and-drop gestures** (linked list) feel different on a real iPhone than in a simulator — test on a real device.
- **Prisma 7 bans `url` in `datasource` block.** Adding `url = env("DATABASE_URL")` to `schema.prisma` fails validation with P1012. The URL must live exclusively in `prisma.config.ts → defineConfig({ datasource: { url: … } })`.
- **`prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` generates migration SQL without a live DB.** Use this to prepare migration files locally; apply with `prisma migrate deploy` once the DB is available. Never use `prisma db push` — it bypasses migration history.

## Technical debt log (intentional shortcuts to revisit if time allows)

- (empty — add here when a shortcut is taken, e.g. "leaderboard query not yet indexed; fine for demo scale, revisit if slow")

## Anti-patterns already rejected (do not reintroduce)

- Computing correctness/score on the client.
- `if (type === ...)` challenge branching scattered across modules.
- Sending the correct answer to the client before submission.
- Adding realtime sockets, microservices, a 3D engine, or a caching layer.
- Storing local time in the DB.

## Open questions for the developer (resolve before relevant work)

- (empty — log anything that needs a human decision here so it isn't silently guessed)

## Bug journal (append as bugs are found & fixed)

- (empty — format: `[date] symptom → root cause → fix → lesson`)
