# LOGIC.md — Backend Technical Reference

This document is a complete, file-by-file map of `backend/src/`, followed by the full
request lifecycle for the two most important endpoints (`GET /daily` and
`POST /submissions`) and a dedicated explanation of the challenge-engine registry
pattern. Every file under `backend/src/` has its own entry below — none are grouped or
skipped. Files outside `src/` (Prisma schema/migrations, generated client, tests,
config) are referenced only where relevant to understanding `src/`.

All routes are mounted under `/api` (`app.setGlobalPrefix('api')` in `main.ts`), so a
controller decorated `@Controller('daily')` is reachable at `GET /api/daily`. The
descriptions below use the un-prefixed path (`/daily`) to match the `@Controller`/`@Get`
decorators in the code.

---

## 1. Entry point and root module

### `src/main.ts`
**Purpose:** Application bootstrap — the only place the Nest app is created, configured,
and started.
**What it does:**
- Creates the Nest app from `AppModule`.
- Reads `PORT`, `NODE_ENV`, `CORS_ORIGINS` from `ConfigService`.
- Applies `helmet()` for security headers (before CORS, so headers aren't stripped).
- Calls `app.enableCors(...)` with an origin computed by the local `parseCorsOrigins()`
  helper: in any non-production `NODE_ENV` it returns `'*'` (CORS wide open); in
  production it returns `false` (block everything) if `CORS_ORIGINS` is unset, or the
  parsed comma-separated list otherwise.
- Installs a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`,
  implicit type conversion) — every DTO in every module is validated/sanitized through
  this one pipe.
- Installs `GlobalExceptionFilter` and `RequestLoggingInterceptor` globally.
- Sets the global route prefix `'api'`.
- Listens on `port` and logs the resolved mode/CORS config.
**Connects to:** `AppModule` (the whole app graph), `GlobalExceptionFilter`
(`common/filters`), `RequestLoggingInterceptor` (`common/interceptors`).

### `src/app.module.ts`
**Purpose:** The root Nest module — wires every feature module together and configures
the three cross-cutting, app-wide concerns: env config, rate limiting, and the database.
**What it does:**
- `ConfigModule.forRoot()`: loads `.env.<NODE_ENV>` (default `development`), marks
  config global (`isGlobal: true`, so `ConfigService` is injectable anywhere without
  re-importing `ConfigModule`), and runs a `validate()` callback that throws at boot if
  `DATABASE_URL` or `JWT_SECRET` is missing from `REQUIRED_VARS`.
- `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])`: default app-wide rate limit
  of 60 requests/60s; individual routes (`auth.controller.ts`,
  `submissions.controller.ts`) override this with their own `@Throttle(...)`.
- Imports every other module: `PrismaModule`, `ChallengesModule`, `HealthModule`,
  `AuthModule`, `UsersModule`, `ClassesModule`, `TasksModule`, `DailyModule`,
  `AssignmentsModule`, `SubmissionsModule`, `StreakModule`, `BadgeModule`,
  `LeaderboardModule`, `StatsModule`, `RotationModule`.
**Connects to:** every module listed above; this is the single place that assembles the
whole dependency graph `main.ts` bootstraps.

---

## 2. `src/auth/` — registration, login, JWT issuance/validation

### `src/auth/auth.controller.ts`
**Purpose:** HTTP surface for `/auth`.
**What it does:** Three routes — `POST /auth/register` and `POST /auth/login` (both
rate-limited to 10/60s via route-level `@Throttle`, stricter than the app default, since
these are unauthenticated and brute-forceable), and `GET /auth/me` (guarded by
`JwtAuthGuard`). All three just delegate to `AuthService`; `me()` pulls the caller's id
off the `@CurrentUser()` decorator.
**Connects to:** `AuthService` (business logic), `RegisterDto`/`LoginDto` (request
validation), `JwtAuthGuard` + `CurrentUser`/`JwtPayload` from `common/`.

### `src/auth/auth.module.ts`
**Purpose:** Wires together everything `auth.controller.ts` needs.
**What it does:** Imports `ConfigModule` (so the factory below can read env vars),
`PassportModule`, and `JwtModule.registerAsync(...)` which builds the signing config
from `ConfigService.get('JWT_SECRET')` — this is the *only* place `JwtModule` is
configured; `JwtStrategy` (verification side) reads `JWT_SECRET` independently via its
own `ConfigService` injection. Declares `AuthController`, provides `AuthService` and
`JwtStrategy`, and exports `JwtModule` (currently unused by any other module — no other
module imports `AuthModule`).
**Connects to:** `AuthController`, `AuthService`, `JwtStrategy`.

### `src/auth/auth.service.ts`
**Purpose:** All registration/login/me business logic and JWT signing.
**What it does:**
- `register(dto)`: rejects if the email is already taken (`ConflictException`), hashes
  the password with `bcrypt` (cost factor 12), generates a deterministic DiceBear avatar
  URL seeded by the email, creates the `User` row (`role: 'user'` always — there is no
  public way to self-register as admin), and returns `{ token, user }`.
- `login(dto)`: looks up by email, compares the password hash, throws
  `UnauthorizedException('Invalid credentials')` for either "no such user" or "wrong
  password" (same message for both, to avoid leaking which case failed), returns
  `{ token, user }`.
- `me(id)`: returns the public profile fields for the given user id, 404s if missing.
- `signToken(sub, email, role)` (private): signs a JWT whose payload is
  `{ sub, email, role }` with `expiresIn` read from `JWT_EXPIRES_IN` (default `'7d'`,
  cached in the constructor).
**Connects to:** `PrismaService` (the `User` table), `JwtService` (from
`@nestjs/jwt`), `ConfigService`, `RegisterDto`/`LoginDto`.

### `src/auth/dto/login.dto.ts`
**Purpose:** Request-shape validation for `POST /auth/login`.
**What it does:** `email: @IsEmail()`, `password: @IsString()`. No length check on
password at login (intentionally — only registration enforces a minimum length; a
shorter password could still be a legitimate already-existing one if the minimum was
raised later).
**Connects to:** Consumed by `AuthController.login` / `AuthService.login`; validated by
the global `ValidationPipe`.

### `src/auth/dto/register.dto.ts`
**Purpose:** Request-shape validation for `POST /auth/register`.
**What it does:** `email: @IsEmail()`, `password: @IsString() @MinLength(8)`,
`name: @IsString()`, `classId?: @IsOptional() @IsInt()`.
**Connects to:** `AuthController.register` / `AuthService.register`; `classId` is a
foreign key into `Class` (no existence check happens here — an invalid `classId` would
surface as a Prisma foreign-key error, translated by `GlobalExceptionFilter`).

### `src/auth/jwt.strategy.ts`
**Purpose:** Passport strategy that verifies bearer JWTs on every guarded request.
**What it does:** Extends `PassportStrategy(Strategy)` from `passport-jwt`, configured
to extract the token from the `Authorization: Bearer <token>` header and verify its
signature/expiry against `JWT_SECRET` (falls back to the literal string
`'fallback-secret'` if unset — in practice this never happens because `AppModule`'s env
validation already requires `JWT_SECRET`). `validate(payload)` is called by Passport
*after* signature/expiry checks pass; it just re-shapes the payload into a
`JwtPayload` and throws `UnauthorizedException` if `sub` is missing. The returned value
becomes `request.user`.
**Connects to:** Registered as a provider in `AuthModule`, but — because the underlying
`passport` library registers strategies by name (`'jwt'`) in a process-wide registry,
not scoped to Nest's DI graph — any `AuthGuard('jwt')` anywhere in the app (i.e.
`JwtAuthGuard`, used by nearly every other module) can use this strategy as long as
`AuthModule` is loaded somewhere in the app (it is, via `AppModule`). `JwtPayload` is
imported from `common/decorators/current-user.decorator.ts` (defined there, reused
here) to keep one canonical shape for "the decoded user."

---

## 3. `src/challenges/` — the challenge engine and its registry

See also **Section 6: Challenge engine registry pattern** below for the end-to-end
explanation of how these pieces fit together and how to add a new challenge type.

### `src/challenges/challenge.interface.ts`
**Purpose:** Defines the contract every challenge type must implement.
**What it does:** Exports `GradeResult` (`{ isCorrect, points, correctAnswer }`) and
`ChallengeStrategy`, an interface with five methods: `generateConfig()` (produce a new,
answer-free config), `validateConfig(config)` (shape-check a config, used at
task-creation time), `computeAnswer(config)` (the single source of truth for "what's
correct," server-only), `validate(config, submission)` (boolean correctness check —
defined but not currently called from any controller/service; `grade` is what's
actually used at submission time), and `grade(config, actions)` (the method actually
invoked by `SubmissionsService`, returning a full `GradeResult`).
**Connects to:** Implemented by all five files in `challenges/strategies/`; the type is
re-exported by `challenge.registry.ts`.

### `src/challenges/challenge.registry.ts`
**Purpose:** The actual registry storage — a plain, framework-free TypeScript module,
not a NestJS class.
**What it does:** Holds a single module-level `Map<string, ChallengeStrategy>` (a
process-wide singleton — it exists once for the life of the Node process, independent
of how many times any NestJS provider that wraps it gets instantiated) and four free
functions operating on it: `registerStrategy(type, strategy)`, `resolveStrategy(type)`
(throws `Error` if unknown), `isKnownType(type)`, `listTypes()`. Re-exports the
`ChallengeStrategy` type so other files can `import type { ChallengeStrategy } from
'./challenge.registry'` if convenient.
**Connects to:** Used exclusively by `challenge-registry.service.ts`, which is the only
file that calls `registerStrategy`.

### `src/challenges/challenge-registry.service.ts`
**Purpose:** The NestJS-injectable façade in front of `challenge.registry.ts`.
**What it does:** Implements `OnModuleInit`; in `onModuleInit()` it calls
`registerStrategy(...)` once for each of the five known types
(`bubble_sort`, `linked_list`, `binary_search`, `stack_ops`, `queue_ops`), pointing each
at the corresponding exported strategy object from `challenges/strategies/`. Exposes
`isKnownType`, `resolve`, `listTypes` as thin instance methods that just call through to
the module-level functions in `challenge.registry.ts`.
**Connects to:** Provided/exported by `challenges.module.ts`; injected directly into
`DailyService`, `TasksService`, `SubmissionsService`, and `RotationService` (all import
it via the relative path `'../../challenges/challenge-registry.service'`, relying on
`ChallengesModule`'s `@Global()` decorator rather than each importing
`ChallengesModule` explicitly).

### `src/challenges/challenges.module.ts`
**Purpose:** Makes `ChallengeRegistryService` available everywhere.
**What it does:** `@Global() @Module({ providers: [ChallengeRegistryService], exports:
[ChallengeRegistryService] })` — the `@Global()` decorator is why `DailyService`,
`TasksService`, `SubmissionsService`, and `RotationService` can inject
`ChallengeRegistryService` without their own modules importing `ChallengesModule`.
**Connects to:** Imported once, in `app.module.ts`; from then on its export is visible
app-wide.

### `src/challenges/strategies/bubble-sort.strategy.ts`
**Purpose:** Challenge logic for `bubble_sort`.
**What it does:** `generateConfig()` produces a random 5–7 element integer array and
`stepsToPredict: 3`. `computeBubbleSortSteps(array, steps)` runs the standard
adjacent-comparison bubble-sort pass, capturing one step per comparison (`{ array
(snapshot after this step), swapped, i, j }`) up to `steps` steps. `validateConfig`
checks `array` is a non-empty number array and `stepsToPredict` is a positive integer.
`computeAnswer` = the step list. `validate` compares a submitted step list against it
element-by-element. `grade(config, actions)`: the user submits one `{ step, didSwap }`
prediction per step; correctness requires every `didSwap` to match the actual
`swapped` flag at that step; points are `config.points` (default 10) if fully correct,
else 0.
**Connects to:** Registered under key `'bubble_sort'` by `ChallengeRegistryService`;
`config.points` is set by `generateConfig` but tasks created via `POST /tasks` can omit
it (defaults to 10 in `grade`).

### `src/challenges/strategies/linked-list.strategy.ts`
**Purpose:** Challenge logic for `linked_list`.
**What it does:** Models a singly linked list as a plain `number[]`. `generateConfig()`
picks 3–6 random node values and a random `operation` from 8 options (`delete_head`,
`delete_tail`, `delete_at`, `delete_middle`, `insert_head`, `insert_tail`, `insert_at`,
`reverse`); operations that need a position (`delete_at`/`insert_at`) get a random
`targetIndex`, operations that insert get a random `insertValue`. `applyOperation`
mutates a copy of `nodes` according to `operation` — this is `computeAnswer`.
`validateConfig` checks `nodes` shape, that `operation` is one of the eight known
strings, and that `insertValue`/`targetIndex` are present (and in-range) when the
operation requires them. `grade(config, actions)`: the user submits a single action
`{ result: number[] }` — their predicted final list — compared element-by-element
against `computeAnswer(config)`.
**Connects to:** Registered under `'linked_list'`.

### `src/challenges/strategies/binary-search.strategy.ts`
**Purpose:** Challenge logic for `binary_search`.
**What it does:** `generateConfig()` builds a sorted, strictly-ascending, unique-integer
array of 5–15 elements; 70% of the time `target` is a value actually in the array
(`targetExists: true`), otherwise a value guaranteed absent. `computeBinarySearchSteps`
replays the textbook iterative binary search, recording `{ low, high, mid, value,
found, eliminated }` for each comparison until the target is found or `low > high`
(`eliminated` is `'left'`/`'right'`/`'none'`, i.e. which half got discarded). The file's
header comment walks through three worked examples (found in one step, found in two,
not-found in three) matching the task spec this strategy was built against.
`validateConfig` enforces a non-empty, strictly-ascending numeric array plus a numeric
`target` and boolean `targetExists`. `grade(config, actions)`: the user submits one
`{ mid }` action per step they predict binary search will check; correctness requires
the submitted `mid` sequence to exactly match the real one (length and values).
**Connects to:** Registered under `'binary_search'`.

### `src/challenges/strategies/stack-ops.strategy.ts`
**Purpose:** Challenge logic for `stack_ops`.
**What it does:** `generateConfig()` builds a sequence of 4–6 `push`/`pop` operations
(the first two are always `push`, guaranteeing the stack is never empty for an early
`pop`; afterwards there's a 55% bias toward `push`). `simulateStack` replays the
sequence and snapshots `{ stack, operation }` after each of the first `stepsToPredict`
(3) operations — that's `computeAnswer`. `validateConfig` requires at least 3
operations, a positive integer `stepsToPredict`, and that every operation is a
well-formed `{ op: 'push', value: number }` or `{ op: 'pop' }`. `grade(config, actions)`:
the user submits `{ step, stack: number[] }` per step — their predicted stack contents
after that operation — compared element-by-element against the real snapshot.
**Connects to:** Registered under `'stack_ops'`.

### `src/challenges/strategies/queue-ops.strategy.ts`
**Purpose:** Challenge logic for `queue_ops`.
**What it does:** Mirrors `stack-ops.strategy.ts` but for FIFO semantics: `enqueue`
pushes to the back, `dequeue` shifts off the front. `generateConfig()` builds 4–6
operations (first two always `enqueue`, then a 50/50 enqueue/dequeue mix while a
dequeue is legal). `simulateQueue` snapshots `{ queue, operation }` per step.
`validateConfig` requires at least 1 operation, a positive integer `stepsToPredict`, and
well-formed `{ op: 'enqueue', value: number }` / `{ op: 'dequeue' }` entries. `grade`:
the user submits one predicted queue-contents array per step, matched element-by-element
against the real snapshot's `queue`.
**Connects to:** Registered under `'queue_ops'`.

---

## 4. `src/common/` — cross-cutting decorators, guards, filters, interceptors, utils

### `src/common/decorators/current-user.decorator.ts`
**Purpose:** Pulls the authenticated user off the request inside a controller method
signature.
**What it does:** Exports the `JwtPayload` interface (`{ sub: number; email: string;
role: string }`) — this is the canonical shape used everywhere a "decoded JWT" is
passed around — and `CurrentUser`, a `createParamDecorator` that reads
`request.user` (populated earlier by Passport via `JwtStrategy.validate`).
**Connects to:** `JwtPayload` is imported by `jwt.strategy.ts`, `roles.guard.ts`, and
every controller that needs `@CurrentUser()` (auth, badges, daily, leaderboard,
streak, submissions, users).

### `src/common/decorators/roles.decorator.ts`
**Purpose:** Attaches required-role metadata to a route/controller for `RolesGuard` to
read.
**What it does:** `ROLES_KEY = 'roles'`; `Roles(...roles)` is `SetMetadata(ROLES_KEY,
roles)`.
**Connects to:** Read by `RolesGuard` via `Reflector.getAllAndOverride`; applied in
`assignments`, `classes`, `stats`, `tasks`, `users` controllers (anywhere admin-only
behavior is needed).

### `src/common/filters/global-exception.filter.ts`
**Purpose:** Single place that turns *any* thrown value into a consistent JSON error
response, and logs it.
**What it does:** `@Catch()` (no argument → catches everything). For a Nest
`HttpException`, relays its real status code and response body. For a raw Prisma client
error (duck-typed via `isPrismaError` — checks for a string `code` field), translates
`P2002` (unique constraint) to `409 Conflict` with a message naming the conflicting
field(s), and `P2025` (record not found) to `404 Not Found`. Everything else becomes a
generic `500 Internal Server Error` (so raw stack traces/internals are never leaked to
clients). Logs at `error` level (with stack trace) for 5xx, `warn` for everything else.
Response shape: `{ statusCode, timestamp, path, message }`.
**Connects to:** Registered globally in `main.ts` via `app.useGlobalFilters(...)` — every
controller in the app is covered without per-module registration. The Prisma error
codes it special-cases come from `@prisma/client`'s well-known error-code list.

### `src/common/guards/jwt-auth.guard.ts`
**Purpose:** The standard "require a valid JWT" guard.
**What it does:** One line — `class JwtAuthGuard extends AuthGuard('jwt') {}`. All the
real logic (token extraction, signature/expiry check, attaching `request.user`) lives in
Passport's `AuthGuard` base class plus `JwtStrategy`.
**Connects to:** Applied via `@UseGuards(JwtAuthGuard)` on nearly every controller
(`badges`, `daily`, `leaderboard`, `streak`, `submissions`, `tasks`, `users`,
`assignments`, `classes`, `stats`) and on `AuthController.me`.

### `src/common/guards/roles.guard.ts`
**Purpose:** The "require a specific role" guard, layered on top of `JwtAuthGuard`.
**What it does:** Reads the `roles` metadata set by `@Roles(...)` (checking both the
handler and the controller class, so a class-level `@Roles('admin')` covers every method
unless a method overrides it). If no roles are required, allows the request through
unconditionally. Otherwise reads `request.user.role` (populated by `JwtAuthGuard`, which
must run first) and throws `ForbiddenException('Insufficient role')` if it's not in the
required list.
**Connects to:** Always paired with `JwtAuthGuard` (must come first in the
`@UseGuards(...)` list, since `RolesGuard` reads `request.user` which only
`JwtAuthGuard` populates) — used in `assignments`, `classes` (write routes only),
`stats`, `tasks` (write routes only), `users` controllers.

### `src/common/interceptors/request-logging.interceptor.ts`
**Purpose:** Structured access logging for every request.
**What it does:** Logs `→ METHOD URL` at `debug` level when a request starts, then on
completion (success or error) logs `METHOD URL STATUS +Nms` at `log` level (or `ERR
+Nms` if the request pipeline threw).
**Connects to:** Registered globally in `main.ts` via
`app.useGlobalInterceptors(...)` — wraps every route in the app.

### `src/common/utils/hcm-date.ts`
**Purpose:** The single source of truth for "what day is it in Vietnam," used
everywhere the app needs to reason about a calendar day rather than a raw UTC instant.
Vietnam (Asia/Ho_Chi_Minh) is UTC+7 with no daylight saving, so the +7h offset is safe
to hardcode rather than depending on a timezone database.
**What it does:** Four functions:
- `getHcmToday()`: returns a `Date` whose UTC components equal *today's* HCM calendar
  date at UTC midnight — i.e. the value used to query `DailyAssignment.date` (a
  `@db.Date` column, stored as a bare calendar date, no time).
- `toHcmDateString(date)`: converts any UTC `Date` to its HCM calendar date as a
  `YYYY-MM-DD` string — used to bucket `Submission.createdAt` rows by "which HCM day did
  this happen on."
- `getHcmDayUtcRange(hcmDay)`: given an `hcmDay` marker (as returned by
  `getHcmToday()`), returns the precise `[start, end)` UTC instant range that covers
  exactly that one HCM calendar day — used for `Timestamptz` range queries against
  `Submission.createdAt`.
- `getHcmWeekRange()`: returns the current ISO week (Monday–Sunday) in HCM time as a UTC
  `[weekStart, weekEnd]` instant range plus `YYYY-MM-DD` display strings for the HCM
  Monday and Sunday — used by the leaderboard and stats weekly aggregation.
**Connects to:** Imported by `assignments.service.ts`, `daily.service.ts`,
`leaderboard.service.ts`, `rotation.service.ts`, `stats.service.ts`,
`streak.service.ts`, `submissions.service.ts` — i.e. almost every service that touches
"today" or "this week." `auto-assign.service.ts` notably does **not** import this file —
it computes its own HCM offset inline (see Section 6.1's caveat).

### `src/common/utils/hcm-date.spec.ts`
**Purpose:** Unit tests for `hcm-date.ts`, focused on the exact day/week boundary
instants where bugs are most likely.
**What it does:** Mocks `Date.now()` to specific UTC instants and asserts:
`getHcmToday()` correctly rolls over at the HCM midnight boundary (23:59 vs 00:01 HCM,
which straddle UTC 16:59/17:01 of different UTC calendar days);
`getHcmDayUtcRange()` groups same-HCM-day submissions into one range and splits
adjacent-day submissions into non-overlapping ranges; `getHcmWeekRange()` correctly
attributes a Sunday-23:59:59-HCM submission to the *ending* week and a
Monday-00:01-HCM submission to the *new* week, including the sub-second boundary case
(23:59:59.999 vs .500).
**Connects to:** Pure unit test of `hcm-date.ts`; run via `npm run test` (Jest picks up
any `*.spec.ts` under `src`, configured in `package.json`'s `"jest"` block).

---

## 5. `src/health/` — liveness check

### `src/health/health.controller.ts`
**Purpose:** Unauthenticated liveness probe for uptime monitoring / deploy platforms.
**What it does:** `GET /health` → `{ status: 'ok', timestamp: <ISO now> }`. No guards, no
dependencies, no database call — deliberately the cheapest possible "is the process
alive and routing requests" check (it does *not* verify the database connection).
**Connects to:** Nothing else; intentionally standalone.

### `src/health/health.module.ts`
**Purpose:** Wraps `HealthController` into a module.
**What it does:** `@Module({ controllers: [HealthController] })` — no providers, no
imports.
**Connects to:** Imported once by `app.module.ts`.

---

## 6. `src/modules/` — feature modules

### 6.1 `src/modules/assignments/`

#### `src/modules/assignments/assignments.controller.ts`
**Purpose:** Admin-facing HTTP surface for managing which `Task` is scheduled on which
calendar date.
**What it does:** Class-level `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin')` —
every route here requires an admin. `GET /assignments?date=YYYY-MM-DD` (defaults to
today if `date` omitted) lists assignments for that date with task details. `POST
/assignments` manually creates a single `(taskId, date)` assignment (admin picks the
task explicitly; relies on the DB's unique `(taskId, date)` constraint to reject
duplicates — surfaced as `409` by `GlobalExceptionFilter`). `POST /assignments/generate`
(redundantly re-decorated with `@UseGuards(RolesGuard) @Roles('admin')`, harmless since
the class-level guards already require admin) takes `{ date }` and forces
`AutoAssignService.ensureTodayAssigned` to run for an arbitrary date — this is how the
admin web's "Assignments" page lets an admin preview/backfill a future date without
waiting for a real user to trigger `GET /daily` for that day. `DELETE /assignments/:id`
removes one assignment.
**Connects to:** `AssignmentsService` for everything; `CreateAssignmentDto` validates the
manual-create body.

#### `src/modules/assignments/assignments.module.ts`
**Purpose:** Wires the assignments feature together.
**What it does:** Declares `AssignmentsController`; provides both `AssignmentsService`
and `AutoAssignService`; **exports `AutoAssignService`** (but not `AssignmentsService`)
so other modules can trigger auto-assignment without needing the full CRUD service.
**Connects to:** Imported by `DailyModule` specifically to get `AutoAssignService`.

#### `src/modules/assignments/assignments.service.ts`
**Purpose:** CRUD + manual-trigger business logic backing `AssignmentsController`.
**What it does:** `create(dto)` verifies the task exists (404 otherwise), then inserts a
`DailyAssignment` (duplicate `(taskId, date)` bubbles up as a Prisma `P2002`, becoming a
409). `findByDate(dateStr?)` defaults to `getHcmToday()` when no date is given, includes
each assignment's task summary. `remove(id)` 404s if missing, else deletes.
`generateForDate(dateStr)` parses the date string and delegates straight to
`AutoAssignService.ensureTodayAssigned(date)`.
**Connects to:** `PrismaService`, `CreateAssignmentDto`, `getHcmToday` (from
`common/utils/hcm-date.ts`), `AutoAssignService` (injected directly, not via the module
export — both live in the same module so this is a same-module sibling injection).

#### `src/modules/assignments/auto-assign.service.ts`
**Purpose:** One of **two independent mechanisms** in this codebase that populate
`DailyAssignment` rows for "today" (see the callout in Section 7 and Section 6.6 for the
other one, `RotationService`). This one drives `GET /daily` directly.
**What it does:** `ensureTodayAssigned(date)`:
1. Shifts `date` by +7h to get HCM-local components, reads `WEEKLY_SCHEDULE[dayOfWeek]`
   — a hand-curated map of **exactly two** challenge types per weekday (e.g. Monday →
   `['bubble_sort', 'stack_ops']`, Tuesday → `['linked_list', 'queue_ops']`, etc., with
   no entry meaning "no schedule, do nothing").
2. Computes a deterministic `seed` by summing the character codes of the `YYYY-MM-DD`
   date string — this replaces randomness with a same-task-all-day-long, no-database-
   state-needed selection rule (contrast with `RotationService`'s DB-persisted
   round-robin cursor).
3. Loads existing `DailyAssignment` rows for that date (joined with task type). If
   exactly 6 rows exist (2 scheduled types × 3 difficulties) and every one of them is one
   of today's 2 scheduled types, it's already correct — no-op, return early.
4. Otherwise, deletes any existing rows whose task type is **not** one of today's 2
   scheduled types (cleans up leftovers from a previous day's different schedule, or from
   a manual admin assignment of an off-schedule type).
5. For each of the 2 scheduled types × 3 difficulties (`easy`/`medium`/`hard`), loads all
   `Task`s matching `(type, difficulty)` ordered by `id`, deterministically picks one via
   `seed % candidates.length`, and inserts it as a new `DailyAssignment` if that slot
   isn't already filled by a surviving row. Silently skips a slot with zero candidate
   tasks (logged nowhere — just `continue`).
**Connects to:** `PrismaService` only (no `ChallengeRegistryService` dependency — the
2-types-per-day schedule is hardcoded here, independent of which types are actually
registered in the challenge engine). Called by `DailyService.getTodayTasks` (every `GET
/daily`) and `AssignmentsService.generateForDate` (admin `POST /assignments/generate`).
**Caveat:** computes its own `+7h` HCM offset inline rather than using
`common/utils/hcm-date.ts` — functionally equivalent for this file's purposes, but means
the HCM-offset constant is duplicated across the codebase instead of having one
canonical implementation.

#### `src/modules/assignments/dto/create-assignment.dto.ts`
**Purpose:** Request-shape validation for the manual `POST /assignments` body.
**What it does:** `taskId: @IsInt() @IsPositive()`; `date: @Matches(/^\d{4}-\d{2}-\d{2}$/)`
(strict `YYYY-MM-DD` format check).
**Connects to:** `AssignmentsController.create` / `AssignmentsService.create`.

### 6.2 `src/modules/badges/`

#### `src/modules/badges/badge.controller.ts`
**Purpose:** HTTP surface for a user's own badges.
**What it does:** `@UseGuards(JwtAuthGuard) GET /badges` → `BadgeService.getUserBadges`
for the current user.
**Connects to:** `BadgeService`.

#### `src/modules/badges/badge.module.ts`
**Purpose:** Wires the badges feature together.
**What it does:** Declares `BadgeController`, provides and **exports** `BadgeService` (so
`SubmissionsModule` can import it).
**Connects to:** Imported by `SubmissionsModule`.

#### `src/modules/badges/badge.service.ts`
**Purpose:** Badge-award rules and the read endpoint backing `GET /badges`.
**What it does:** Two hardcoded threshold tables: `SUBMISSION_THRESHOLDS` (lifetime
submission counts 1/10/50/100 → badge keys `first_submit`/`submissions_10`/
`submissions_50`/`submissions_100`) and `STREAK_THRESHOLDS` (current streak 3/7/30 →
`streak_3`/`streak_7`/`streak_30`). `checkAndAward(userId, streakCurrent)` (called after
every submission, from `SubmissionsService`) counts the user's total submissions,
checks whether the count or the just-computed streak value *exactly equals* one of the
threshold keys (not "at least" — a badge only has one chance to fire, at the precise
count/streak value), and for each match upserts a `UserBadge` row, catching the unique
constraint violation (Prisma `P2002`) so an already-awarded badge is skipped silently
rather than erroring. `getUserBadges(userId)` returns all earned badges (joined with
`Badge` for name/description/icon), oldest-awarded first.
**Connects to:** `PrismaService` (`Submission`, `Badge`, `UserBadge` tables); called from
`SubmissionsService.create` after every graded submission.

### 6.3 `src/modules/classes/`

#### `src/modules/classes/classes.controller.ts`
**Purpose:** CRUD HTTP surface for school classes.
**What it does:** `GET /classes` is **public** (no guard) — explicitly commented as
needed for the registration screen's class picker (a brand-new user must be able to see
class options before they have a token). `POST`/`PATCH /:id`/`DELETE /:id` are all
`JwtAuthGuard + RolesGuard('admin')`.
**Connects to:** `ClassesService`; `CreateClassDto`/`UpdateClassDto`.

#### `src/modules/classes/classes.module.ts`
**Purpose:** Wires the classes feature together. No exports — nothing else in the app
currently needs to inject `ClassesService` directly.

#### `src/modules/classes/classes.service.ts`
**Purpose:** CRUD logic for `Class`.
**What it does:** `create`, `findAll` (alphabetical by name), `findOne` (404 if missing —
used internally by `remove`), `update`, `remove` (existence-checks via `findOne` first,
so a missing id 404s cleanly instead of surfacing a raw Prisma `P2025`).
**Connects to:** `PrismaService` (`Class` table, plus its `users` relation implicitly via
cascading FK behavior defined in `schema.prisma`, not in this file).

#### `src/modules/classes/dto/create-class.dto.ts`
**Purpose:** Validates `POST /classes` body: `name: @IsString()`, `grade: @IsString()`.

#### `src/modules/classes/dto/update-class.dto.ts`
**Purpose:** Validates `PATCH /classes/:id` body: both `name` and `grade` optional
strings (partial update).

### 6.4 `src/modules/daily/`

#### `src/modules/daily/daily.controller.ts`
**Purpose:** HTTP surface for "what should I work on today."
**What it does:** `@UseGuards(JwtAuthGuard) GET /daily` → `DailyService.getTodayTasks`
for the current user. The single most-used endpoint by the mobile client's home screen.
**Connects to:** `DailyService`.

#### `src/modules/daily/daily.module.ts`
**Purpose:** Wires the daily feature together.
**What it does:** Imports `AssignmentsModule` specifically to obtain its exported
`AutoAssignService` for injection into `DailyService`.
**Connects to:** `AssignmentsModule` (for `AutoAssignService`); `ChallengeRegistryService`
is available to `DailyService` via the global `ChallengesModule` without an explicit
import here.

#### `src/modules/daily/daily.service.ts`
**Purpose:** Builds the "today's challenges, grouped by subject" view returned by `GET
/daily` — see Section 7.1 for the full step-by-step request lifecycle.
**What it does:** Calls `AutoAssignService.ensureTodayAssigned(new Date())` first (so the
endpoint is self-healing — assignments get created/fixed on first access of the day, no
cron dependency required for this path to work). Loads today's `DailyAssignment`s with
their `Task`s, counts each task's submissions-today (via `Prisma.groupBy`, scoped to the
exact HCM-day UTC window), groups tasks by `type` into `DailySubjectView[]` (each with a
human label derived from the snake_case type via the local `toLabel()` helper, e.g.
`binary_search` → `"Binary Search"`), sorts each subject's tasks easy→medium→hard, and
orders the subjects themselves by the challenge registry's registration order, filtered
to only the types actually assigned today.
**Connects to:** `PrismaService`, `ChallengeRegistryService` (only for `listTypes()`, to
get a stable subject ordering — does not call `resolve()`/`grade()`, this endpoint never
touches answer-checking), `AutoAssignService`, `getHcmToday`/`getHcmDayUtcRange` from
`common/utils/hcm-date.ts`.

### 6.5 `src/modules/leaderboard/`

#### `src/modules/leaderboard/leaderboard.controller.ts`
**Purpose:** HTTP surface for the weekly leaderboard.
**What it does:** `@UseGuards(JwtAuthGuard) GET /leaderboard` →
`LeaderboardService.getWeekly` for the current user (needed so the response can flag
which row `isCurrentUser` and report `currentUserRank`).
**Connects to:** `LeaderboardService`.

#### `src/modules/leaderboard/leaderboard.module.ts`
**Purpose:** Wires the leaderboard feature together. No imports beyond the Nest defaults,
no exports.

#### `src/modules/leaderboard/leaderboard.service.ts`
**Purpose:** Computes the current HCM week's points leaderboard.
**What it does:** `getWeekly(currentUserId)`: gets `[weekStart, weekEnd]` from
`getHcmWeekRange()`, loads every `Submission` in that window, reduces them to "best
attempt per `(user, task, HCM-day)`" (the **best-of-3** rule — a user can attempt the
same task up to 3×/day, only the highest-scoring attempt that day counts), then sums
each user's best-per-day points across the week into a per-user total. Sorts
descending, fetches the matching `User`s (name/avatar/class) in one query, builds
`LeaderboardEntry[]` flagging the caller's own row, and returns the top 50
(`MAX_ENTRIES`) entries plus the caller's numeric rank even if they're outside the
top 50 cutoff (rank is computed before slicing).
**Connects to:** `PrismaService` (`Submission`, `User`, `Class` via relation),
`getHcmWeekRange`/`toHcmDateString` from `common/utils/hcm-date.ts`.

### 6.6 `src/modules/rotation/`

#### `src/modules/rotation/rotation.module.ts`
**Purpose:** Wires the cron-driven rotation feature together.
**What it does:** Imports `ScheduleModule.forRoot()` — this is the module that actually
enables `@Cron(...)` decorators to be discovered and scheduled anywhere in the app (it's
registered here, in a feature module, rather than in `AppModule`; functionally
equivalent in Nest since `forRoot()` registers process-wide scheduling infrastructure
regardless of which module imports it, but unusual placement worth knowing about if
debugging why cron jobs run).
**Connects to:** `RotationService`.

#### `src/modules/rotation/rotation.service.ts`
**Purpose:** The **second, independent** mechanism that populates `DailyAssignment` rows
for "today" — see the callout in Section 7.1.
**What it does:**
- `onModuleInit()`: runs `ensureTodayAssignments()` once at app boot — "self-healing" if
  the process was down at the scheduled cron time.
- `@Cron('0 17 * * *', { timeZone: 'UTC' })` (17:00 UTC = 00:00 GMT+7, i.e. midnight
  Vietnam time): runs `ensureTodayAssignments()` daily.
- `ensureTodayAssignments(date = getHcmToday())`: computes `expectedCount =
  registry.listTypes().length × 3` (i.e. **every** registered challenge type × 3
  difficulties — currently 5 × 3 = 15, *not* the 2-types-per-day schedule
  `AutoAssignService` uses). If today already has `>= expectedCount` rows, no-op. If a
  nonzero-but-incomplete count exists, wipes all of today's rows and regenerates from
  scratch. Otherwise, inside a single `$transaction`, calls `pickNextTask(tx, type,
  difficulty)` for every `(type, difficulty)` pair and inserts a `DailyAssignment` for
  each non-null result (a pair with zero matching tasks is skipped with a `logger.warn`,
  not an error).
- `pickNextTask(tx, type, difficulty)`: implements a true **no-repeat-until-exhausted**
  round robin, persisted in the `TaskRotation` table (rows keyed by the composite string
  `"<type>:<difficulty>"`, stored in the `difficulty` column despite the misleading
  column name — a deliberate reuse of an existing unique string column rather than a
  schema change). Loads the eligible task-id pool for `(type, difficulty)`; if a stored
  shuffle order exists, still has unused entries (`cursor < length`), *and* exactly
  matches the current eligible pool (`sameTaskSet`, order-independent), reuses it and
  advances the cursor; otherwise reshuffles (Fisher–Yates, the local `shuffle()` helper)
  and restarts the cursor at 0 — this is what makes it self-correcting if tasks are
  added/removed for that `(type, difficulty)` between runs.
**Connects to:** `PrismaService` (`DailyAssignment`, `Task`, `TaskRotation`),
`ChallengeRegistryService` (only `listTypes()`), `getHcmToday`. **Does not** import or
coordinate with `AutoAssignService` in any way, despite both writing to the same
`DailyAssignment` table for the same date — see Section 7.1.

### 6.7 `src/modules/stats/`

#### `src/modules/stats/stats.controller.ts`
**Purpose:** Admin dashboard data source.
**What it does:** `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin') GET /stats` →
`StatsService.getWeeklyStats()`. No `:id`/query params — it's always "this week, all
classes."
**Connects to:** `StatsService`.

#### `src/modules/stats/stats.module.ts`
**Purpose:** Wires the stats feature together. No imports/exports beyond Nest defaults.

#### `src/modules/stats/stats.service.ts`
**Purpose:** Per-class weekly completion/points aggregation for the admin dashboard.
**What it does:** Loads all `Class`es (with their `users`' ids) and all `Submission`s in
the current HCM week in parallel, builds a per-user `{ count, points }` aggregate from
the submissions, then for each class sums up totals across its students:
`totalStudents`, `studentsCompleted` (had ≥1 submission this week — not necessarily
*correct*, just attempted), `totalSubmissions`, `totalPoints`, and a derived
`completionRate` (`studentsCompleted / totalStudents`, rounded %, `0` for an empty
class). Returns rows sorted by `completionRate` descending.
**Connects to:** `PrismaService` (`Class`, `Submission`), `getHcmWeekRange`.

### 6.8 `src/modules/streak/`

#### `src/modules/streak/streak.controller.ts`
**Purpose:** HTTP surface for a user's own streak.
**What it does:** `@UseGuards(JwtAuthGuard) GET /streak` →
`StreakService.getStreak`.
**Connects to:** `StreakService`.

#### `src/modules/streak/streak.module.ts`
**Purpose:** Wires the streak feature together; **exports** `StreakService` so
`SubmissionsModule` can import it.
**Connects to:** Imported by `SubmissionsModule`.

#### `src/modules/streak/streak.service.ts`
**Purpose:** Streak increment logic (called after every submission) and the read model
backing `GET /streak`.
**What it does:**
- `checkAndUpdate(userId)` (called from `SubmissionsService.create`): checks
  `hasCompletedAllTasksToday` — true only if the user has **at least one submission**
  (correct or not — "completed" here means "attempted," not "got right") for **every**
  task in today's `DailyAssignment` set. If not all done, returns the existing streak
  unchanged. If all done: no existing `Streak` row → create one at `current: 1, longest:
  1`. Existing row already updated *today* (`lastUpdated` exactly equals today's HCM
  midnight marker) → idempotent no-op, return as-is (guards against double-incrementing
  when two submissions both complete "today" — e.g. the user's last two tasks submitted
  in quick succession). Otherwise: if `lastUpdated` was exactly yesterday, increment
  `current`; any other gap resets `current` to 1; `longest = max(longest, newCurrent)`.
- `getStreak(userId)`: returns `{ current, longest, lastUpdated, daily_history }` where
  `daily_history` comes from `getDailyHistory`.
- `getDailyHistory(userId)` (private): for each of the last 7 HCM calendar days (oldest
  first), reports `{ date, completed }` where `completed` means the user had **at least
  one correct submission** that day (note: a *different* definition of "completed" than
  `hasCompletedAllTasksToday` uses for streak incrementing — this one only needs one
  correct answer somewhere that day, not all tasks attempted). Computed with a single
  query spanning the whole 7-day window rather than 7 separate queries.
**Connects to:** `PrismaService` (`Streak`, `DailyAssignment`, `Submission`),
`getHcmToday`/`getHcmDayUtcRange`/`toHcmDateString`.

### 6.9 `src/modules/submissions/`

#### `src/modules/submissions/dto/create-submission.dto.ts`
**Purpose:** Validates `POST /submissions` body.
**What it does:** `taskId: @IsInt() @IsPositive()`; `actions: @IsArray()` (deliberately
loose — `unknown[]`, since the shape of an "action" is entirely challenge-type-specific
and only the matching `ChallengeStrategy.grade()` knows how to interpret it).

#### `src/modules/submissions/submissions.controller.ts`
**Purpose:** HTTP surface for submitting and reviewing attempts.
**What it does:** Class-level `@UseGuards(JwtAuthGuard)`. `POST /submissions`
(rate-limited to 20/60s, overriding the app-wide 60/60s default since this is the
highest-traffic write endpoint) grades and persists an attempt. `GET /submissions/today`
returns the best attempt per task attempted today. `GET /submissions/today-summary`
returns today's total points plus a per-task breakdown (used by the mobile home
screen's points modal).
**Connects to:** `SubmissionsService` for all three.

#### `src/modules/submissions/submissions.module.ts`
**Purpose:** Wires the submissions feature together.
**What it does:** Imports `StreakModule` and `BadgeModule` to get their exported
services. `ChallengeRegistryService` is available via the global `ChallengesModule`
without an explicit import (noted in a comment in the file).

#### `src/modules/submissions/submissions.service.ts`
**Purpose:** The core grading pipeline — see Section 7.2 for the full step-by-step
request lifecycle.
**What it does:** `create(userId, dto)` runs seven steps: verify the task exists (404);
verify it's actually assigned today (400 `BadRequestException` otherwise — prevents
submitting against stale or future-only tasks); count today's attempts for this
`(user, task)` and reject with `429` (via a raw `HttpException`, not a built-in Nest
exception class) once `MAX_ATTEMPTS` (3) is reached; resolve the matching
`ChallengeStrategy` from the registry (400 if the task's `type` isn't registered) and
call `strategy.grade(config, actions)`; persist a `Submission` row (`isScored: false` —
explained below); update the streak (`StreakService.checkAndUpdate`, errors caught and
logged, never propagated to the caller); award badges (`BadgeService.checkAndAward`,
same error-swallowing); build and return `attemptHistory` plus the grading result.
Also exposes `resolveScore(userId, taskId, date)` (the single best-scoring submission
for that user/task/day — ties go to the earliest attempt) and `getTodaySummary`/
`getTodaySubmissions`, both built on the same "best attempt wins" idea. The `isScored`
column (legacy) is always written `false` and never read by any scoring decision in this
file — "best of up to `MAX_ATTEMPTS` attempts" is resolved at *read* time
(`resolveScore`), not decided once at write time.
**Connects to:** `PrismaService`, `ChallengeRegistryService` (`resolve` →
`strategy.grade`), `StreakService`, `BadgeService`, `getHcmToday`/`getHcmDayUtcRange`.

### 6.10 `src/modules/tasks/`

#### `src/modules/tasks/dto/create-task.dto.ts`
**Purpose:** Validates `POST /tasks` body: `type`/`title` non-empty strings,
`description` optional string, `config` a plain object (its *internal* shape is
strategy-specific and checked separately by `TasksService`, not by this DTO).

#### `src/modules/tasks/dto/update-task.dto.ts`
**Purpose:** Validates `PATCH /tasks/:id` body — same fields as create, all optional
(partial update), with the same "non-empty if present" rule for `type`/`title`.

#### `src/modules/tasks/tasks.controller.ts`
**Purpose:** CRUD HTTP surface for the task bank.
**What it does:** Class-level `@UseGuards(JwtAuthGuard)` — any logged-in user can `GET`
(list or by id). `POST`/`PATCH /:id`/`DELETE /:id` additionally require
`@UseGuards(RolesGuard) @Roles('admin')`.
**Connects to:** `TasksService`.

#### `src/modules/tasks/tasks.module.ts`
**Purpose:** Wires the tasks feature together. `ChallengeRegistryService` is available
to `TasksService` via the global `ChallengesModule` (noted in a comment).

#### `src/modules/tasks/tasks.service.ts`
**Purpose:** CRUD logic for the `Task` bank, with challenge-type-aware validation —
this is the **only place** that validates a task's `config` against its strategy's
rules before allowing it into the database.
**What it does:** `findAll`/`findById` are plain reads (404 on missing id).
`create(dto)`: `assertKnownType(dto.type)` (400 if the registry doesn't recognize it),
`assertValidConfig(dto.type, dto.config)` (400 if `strategy.validateConfig(config)`
returns false), then inserts. `update(id, dto)`: re-validates the *resulting* type
(existing type if `dto.type` is omitted) and, if either `type` or `config` is being
changed, re-validates the resulting config against the resulting type's strategy —
guards against an update silently producing a type/config mismatch. `remove(id)` 404s
via `findById` first, then deletes (cascading to `DailyAssignment`/`Submission` rows per
the FK `onDelete: Cascade` in `schema.prisma` — not enforced in this file, just a
consequence of the schema).
**Connects to:** `PrismaService`, `ChallengeRegistryService` (`isKnownType`, `resolve`
→ `strategy.validateConfig`).

### 6.11 `src/modules/users/`

#### `src/modules/users/users.controller.ts`
**Purpose:** HTTP surface for user profile lookups.
**What it does:** Class-level `@UseGuards(JwtAuthGuard, RolesGuard)`. `GET /users/me` has
no `@Roles(...)`, so `RolesGuard` lets any authenticated user through (no required roles
= pass) — any logged-in user can fetch their own profile. `GET /users` and `GET
/users/:id` both require `@Roles('admin')`.
**Connects to:** `UsersService`.

#### `src/modules/users/users.module.ts`
**Purpose:** Wires the users feature together; **exports** `UsersService` (currently
unused by any other module — no other module imports `UsersModule`).

#### `src/modules/users/users.service.ts`
**Purpose:** Read-only user lookups, always through a fixed field whitelist
(`USER_SELECT` — `id, email, name, role, classId, createdAt`; notably **excludes**
`passwordHash` and `avatarUrl`, so this service can never accidentally leak a password
hash even via a future careless change, though it does mean `avatarUrl` isn't available
through this path — `AuthService.me`/`login`/`register` use their own separate `select`
that does include it).
**What it does:** `findById(id)` (404 if missing), `findAll()` (no pagination — returns
every user).
**Connects to:** `PrismaService` (`User` table) only.

---

## 7. `src/prisma/` — database access layer

### `src/prisma/prisma.module.ts`
**Purpose:** Makes `PrismaService` available everywhere.
**What it does:** `@Global() @Module({ providers: [PrismaService], exports:
[PrismaService] })` — every other service in the app injects `PrismaService` directly
without its module needing to import `PrismaModule`.
**Connects to:** Imported once, in `app.module.ts`.

### `src/prisma/prisma.service.ts`
**Purpose:** The actual Prisma client instance, wired for Prisma 7's driver-adapter
model and Nest's lifecycle.
**What it does:** Extends `PrismaClient` (typed for `'warn' | 'error'` log events).
Reads `DATABASE_URL` straight from `process.env` (**not** via `ConfigService` — this is
intentional/required because the adapter must be constructed inside the `super(...)`
call, before Nest's DI has finished constructing this instance and thus before
`ConfigService` could be injected and used; it relies on `ConfigModule.forRoot()`
having already loaded the right `.env.<NODE_ENV>` file into `process.env` by the time
provider instantiation happens, which it has, since `ConfigModule.forRoot()`'s
`envFilePath` option runs as soon as `app.module.ts` is loaded — see Section 1).
Constructs a `PrismaPg` adapter from that URL and passes it as `adapter` to
`PrismaClient`'s constructor (this — not a `url` field in `schema.prisma` — is how
Prisma 7 wires up the database connection). `onModuleInit()`: subscribes to Prisma's
`warn`/`error` log events (routing them through Nest's `Logger`) and calls `$connect()`.
`onModuleDestroy()`: calls `$disconnect()`. Throws synchronously in the constructor if
`DATABASE_URL` is unset (in practice unreachable in normal boot, since
`app.module.ts`'s `ConfigModule.forRoot()` validation already requires it — but this
file can't rely on that ordering and re-checks independently).
**Connects to:** Injected into literally every other service that touches the database —
`AuthService`, `ClassesService`, `TasksService`, `DailyService`, `AssignmentsService`,
`AutoAssignService`, `SubmissionsService`, `StreakService`, `BadgeService`,
`LeaderboardService`, `StatsService`, `RotationService`, `UsersService`.

---

## 8. Request lifecycle: `GET /daily`

This is the mobile app's home-screen endpoint — "what should I work on today."

1. Client sends `GET /api/daily` with `Authorization: Bearer <jwt>`.
2. `main.ts`'s global middleware/pipeline applies first: `helmet()` headers, CORS check,
   then the request enters Nest's routing. `RequestLoggingInterceptor` logs
   `→ GET /daily`.
3. `DailyController` is `@Controller('daily')` with class-level
   `@UseGuards(JwtAuthGuard)`. `JwtAuthGuard` (→ Passport's `AuthGuard('jwt')` → the
   `'jwt'` strategy registered by `JwtStrategy`) extracts the bearer token, verifies its
   signature/expiry against `JWT_SECRET`, and calls `JwtStrategy.validate(payload)`,
   which returns `{ sub, email, role }`. Passport attaches this to `request.user`. If the
   token is missing/invalid/expired, the guard throws `UnauthorizedException` (401)
   *before* the handler runs — caught by `GlobalExceptionFilter`, returned as
   `{ statusCode: 401, ... }`.
4. The handler `DailyController.getTodayTasks(@CurrentUser() user)` runs.
   `@CurrentUser()` (`common/decorators/current-user.decorator.ts`) reads
   `request.user` and hands it to the method as `user: JwtPayload`.
5. Calls `DailyService.getTodayTasks(user.sub)`.
6. **Auto-assign step (every call, not just the first of the day):**
   `DailyService` calls `AutoAssignService.ensureTodayAssigned(new Date())`:
   - Computes today's HCM weekday and looks up `WEEKLY_SCHEDULE[dow]` → exactly 2
     challenge types for today.
   - Computes a deterministic seed from today's date string.
   - Loads existing `DailyAssignment` rows for today. If exactly the right 6 (2 types ×
     3 difficulties) already exist and all belong to today's 2 scheduled types, returns
     immediately (no-op — this is the common case after the first call of the day).
   - Otherwise deletes any off-schedule rows and inserts whichever of the 6
     `(type, difficulty)` slots are still missing, picking deterministically via
     `seed % candidates.length` so repeated calls the same day always pick the same
     task.
7. Back in `DailyService.getTodayTasks`: computes `today = getHcmToday()`, loads all of
   today's `DailyAssignment`s with their full `Task` rows.
8. For each assigned task, counts the user's submissions today (scoped to the exact HCM
   day's UTC instant range via `getHcmDayUtcRange`) using a single
   `prisma.submission.groupBy` call — this becomes each task's `attemptsToday` (drives
   the mobile UI's "✓ done"/remaining-attempts state; it does **not** reflect whether
   the attempt was correct).
9. Groups tasks by `type` into subjects, sorts each subject's tasks easy→medium→hard,
   and orders the subjects by `ChallengeRegistryService.listTypes()`'s registration
   order (filtered to only types actually assigned today).
10. Returns `DailySubjectView[]`; Nest serializes it to JSON automatically (no explicit
    `@Res()` handling anywhere in this path). `RequestLoggingInterceptor` logs the
    completion line; response goes to the client.

**Important cross-file interaction to know about:** `RotationService`
(`modules/rotation/rotation.service.ts`) *also* writes to `DailyAssignment` for "today,"
on a totally independent schedule (a cron job at 00:00 GMT+7, plus once at app boot) and
with a different policy — it assigns **every** registered challenge type (currently 5)
× 3 difficulties = 15 rows, using a database-persisted no-repeat round robin
(`TaskRotation` table), not the 2-types-per-day `WEEKLY_SCHEDULE`. Because
`AutoAssignService.ensureTodayAssigned` actively *deletes* any assignment whose task
type isn't in today's 2-type schedule, whichever of the two mechanisms runs **last**
effectively wins for that day, until the other one runs again. In practice: if
`RotationService`'s cron fires at midnight and creates 15 rows, the very next `GET
/daily` call that day will immediately delete 9 of them (3 off-schedule types) and
finalize the 6 that match `WEEKLY_SCHEDULE`. This is existing behavior, not something
either service guards against — worth knowing before changing either one.

---

## 9. Request lifecycle: `POST /submissions`

This is the core grading endpoint — every challenge attempt goes through here.

1. Client sends `POST /api/submissions` with `Authorization: Bearer <jwt>` and JSON body
   `{ taskId, actions }`.
2. Same `helmet`/CORS/logging-interceptor entry as above. The global `ValidationPipe`
   validates and transforms the body against `CreateSubmissionDto`
   (`taskId: number, positive int`; `actions: array`) — `whitelist: true` strips any
   extra fields before validation, and `forbidNonWhitelisted: true` rejects the request
   with `400` if it contained any unknown fields at all, rather than silently dropping
   them.
3. `SubmissionsController` class-level `@UseGuards(JwtAuthGuard)` runs the same JWT flow
   described in Section 8, step 3, populating `request.user`.
4. The route also has `@Throttle({ default: { ttl: 60_000, limit: 20 } })`, overriding
   the app-wide default of 60/60s with a stricter 20/60s for this specific route.
5. Handler `create(@CurrentUser() user, @Body() dto)` calls
   `SubmissionsService.create(user.sub, dto)`.
6. Inside `SubmissionsService.create`:
   1. Loads the `Task` by `dto.taskId` — `NotFoundException` (404) if it doesn't exist.
   2. Computes `today = getHcmToday()` and checks a `DailyAssignment` exists for
      `(taskId, today)` — `BadRequestException` (400, "This task is not assigned for
      today") if not. This is what stops someone from submitting against a task that
      isn't (or is no longer, or isn't yet) part of today's schedule.
   3. Counts the user's submissions for `(taskId)` within today's exact HCM UTC window.
      If `>= MAX_ATTEMPTS` (3), throws a raw `HttpException` with status `429` (Too Many
      Requests) and a body `{ message, attemptsUsed, maxAttempts }` — caught by
      `GlobalExceptionFilter`, which (for any `HttpException`) just relays
      `exception.getStatus()`/`exception.getResponse()` as-is.
   4. **Grading (the challenge-engine step):** resolves the `ChallengeStrategy` for
      `task.type` via `ChallengeRegistryService.resolve(task.type)` — if the type isn't
      registered, the registry throws a plain `Error`, which this service catches and
      re-throws as a `BadRequestException` (400, "Challenge type '...' is not yet
      supported for submission"). Calls `strategy.grade(task.config, dto.actions)`. This
      is the **only** point in the entire submission flow where challenge-type-specific
      logic runs, and it runs entirely inside the matching strategy file
      (`challenges/strategies/*.ts`) — `SubmissionsService` itself has no per-type
      branching.
   5. Persists a new `Submission` row: `userId`, `taskId`, `actions` (cast to Prisma's
      JSON input type), `isCorrect`, `points`, `isScored: false` (legacy column, written
      but never consulted for scoring — see `submissions.service.ts`'s entry above).
   6. Calls `StreakService.checkAndUpdate(userId)` — recomputes whether the user has now
      attempted every task assigned today and increments/resets the streak accordingly
      (idempotent against re-running on a retry). Any error here is caught and logged
      (`console.error`), not propagated — a streak-table failure never blocks the
      submission response.
   7. Calls `BadgeService.checkAndAward(userId, streakCurrent)` with the streak value
      just computed — checks lifetime-submission-count and streak thresholds, awards any
      newly-qualifying badges, silently skips already-awarded ones (Prisma `P2002`).
      Same error-swallowing as the streak call.
   8. Builds `attemptHistory` — every attempt today for this `(user, task)`, numbered
      from 1, with the single highest-scoring one flagged `isBest` (ties go to the
      earliest attempt).
   9. Returns `{ id, isCorrect, points, attemptsUsed, maxAttempts, scored: false,
      attemptHistory }`.
7. Response flows back through `RequestLoggingInterceptor`; any exception thrown
   anywhere in the above (including ones from steps 6.1–6.4) is caught by
   `GlobalExceptionFilter` and turned into the standard `{ statusCode, timestamp, path,
   message }` JSON shape.

**Why the answer is never exposed early:** at no point before step 6.4 does any code
path compute or transmit the correct answer. `Task.config` (sent to the client via
`GET /daily`) is generated by `strategy.generateConfig()`, which by contract never
includes the answer — only `strategy.computeAnswer(config)` (called server-side, inside
`grade`/`validate`) derives it. This is the mechanical enforcement of the project's
"backend is the only source of truth" rule.

---

## 10. Challenge engine registry pattern (and how to add a new challenge type)

### How the pieces fit together

The challenge engine is split into two layers, by design:

1. **`challenges/challenge.registry.ts`** — a plain, framework-free TypeScript module.
   It holds a `Map<string, ChallengeStrategy>` at module scope, meaning it is a single
   process-wide singleton that exists independently of NestJS's dependency injection.
   Four free functions (`registerStrategy`, `resolveStrategy`, `isKnownType`,
   `listTypes`) are the only way to read or write that map.
2. **`challenges/challenge-registry.service.ts`** (`ChallengeRegistryService`) — a thin
   `@Injectable()` wrapper around layer 1, so the rest of the app can get it via
   constructor injection. Its `onModuleInit()` lifecycle hook is the **one and only**
   place `registerStrategy(...)` is ever called — once per known type, each pointing at
   a plain object literal exported from `challenges/strategies/*.ts`.
3. **`challenges.module.ts`** marks the service `@Global()`, so any other module
   (`DailyModule`, `TasksModule`, `SubmissionsModule` — via its containing
   `AppModule` graph — and `RotationModule`) can inject `ChallengeRegistryService`
   without explicitly importing `ChallengesModule`.
4. Every concrete strategy (`bubbleSortStrategy`, `linkedListStrategy`,
   `binarySearchStrategy`, `stackOpsStrategy`, `queueOpsStrategy`) is a **plain object
   literal** implementing the five-method `ChallengeStrategy` interface
   (`challenge.interface.ts`) — no class, no decorators, no NestJS dependency
   whatsoever. This keeps the actual challenge logic (generation, validation, grading)
   fully unit-testable and framework-agnostic.

This is what "data-driven, no scattered `if (type === ...)`" means in practice:
`TasksService` (validating a new/updated task's config), `SubmissionsService` (grading
an attempt), and `DailyService`/`RotationService` (enumerating/ordering types) never
branch on the specific string `'bubble_sort'` vs `'linked_list'` etc. They always go
through `registry.resolve(type)` and call the same polymorphic methods. The only file in
the entire backend that knows the literal list of type names is
`challenge-registry.service.ts`'s `onModuleInit()`, plus the hand-curated weekday
schedule in `auto-assign.service.ts`'s `WEEKLY_SCHEDULE` (which intentionally only
includes a subset/specific pairing of types per day, not "all types," and so is not
auto-derived from the registry).

### How to add a new challenge type

1. Create `src/challenges/strategies/<new-type>.strategy.ts` exporting a constant
   implementing `ChallengeStrategy`:
   ```ts
   export const myNewStrategy: ChallengeStrategy = {
     generateConfig() { /* return a config object, never including the answer */ },
     validateConfig(config) { /* shape-check, used at task-creation time */ },
     computeAnswer(config) { /* the single source of truth for "correct" */ },
     validate(config, submission) { /* boolean check, delegates to computeAnswer */ },
     grade(config, actions) { /* return { isCorrect, points, correctAnswer } */ },
   };
   ```
   Follow the existing five strategies' convention: implement `computeAnswer` once, and
   have both `validate` and `grade` derive from it, so there's exactly one place that
   encodes "what's correct" for this challenge type.
2. In `src/challenges/challenge-registry.service.ts`: import the new strategy and add
   one line inside `onModuleInit()`:
   ```ts
   registerStrategy('<new_type>', myNewStrategy);
   ```
   This is the **only** wiring step required for `TasksService`, `SubmissionsService`,
   `DailyService`, and `RotationService` to pick it up automatically — none of them need
   a code change, since they all go through the registry generically.
3. If the new type should appear in the `GET /daily` flow (the `AutoAssignService` path
   most users hit), add it to the relevant weekday(s) in
   `auto-assign.service.ts`'s `WEEKLY_SCHEDULE` map. `RotationService` needs no change —
   it already iterates `challengeRegistry.listTypes()` generically and will include the
   new type automatically on its next cron run.
4. Seed at least one `Task` row per difficulty (`easy`/`medium`/`hard`) with
   `type: '<new_type>'` and a `config` that satisfies the new strategy's
   `validateConfig` — via `POST /api/tasks` (admin, enforced by `TasksService`) or a
   Prisma seed/migration. Both `RotationService` and `AutoAssignService` silently skip
   (no crash, just a log line or a quietly-empty slot) any `(type, difficulty)` pair with
   zero matching tasks — so a forgotten difficulty just means that slot won't be
   assigned, not an error.
5. No other backend file needs to change. (Rendering the new challenge type in the
   mobile/admin clients is a separate, client-side concern outside `backend/`.)
