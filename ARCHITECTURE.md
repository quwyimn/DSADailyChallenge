# ARCHITECTURE.md — System deep dive

> Why the system is shaped the way it is. Read this to understand dependencies, data flow,
> business logic, and the reasoning behind design decisions — so you don't fight the design.

## 1. The shape and why

Three thin clients/servers in a 3-tier layout:

```
[Mobile (user)]  ─┐
                  ├─ HTTPS/JSON ─▶ [NestJS REST API] ─▶ [PostgreSQL / Google Cloud SQL] (Prisma)
[Admin (web)]    ─┘
```

**Why 3-tier and not anything fancier:** the assignment mandates a minimum 3-tier (Client ⇄ REST API ⇄ DB), and the project is built by one person in one month. Every extra moving part (a second service, a queue, a realtime channel) is a thing that can break in production and eat the limited time budget. The architecture is deliberately boring so the product can be solid.

**Why the backend holds all logic:** this is a learning/competition app where users have an incentive to cheat (fake a correct answer, inflate score, fake a streak). If correctness or scoring lived on the client, it could be tampered with. So the backend is the single source of truth and the clients are render + input only. This one decision drives most of the others.

## 2. The central abstraction: the challenge engine

The hardest long-term risk in this app is challenge variety. Naively, each algorithm (bubble sort, linked list, stack…) becomes its own special-case code on both client and server, and by the 4th type the codebase is unmaintainable.

So every challenge is reduced to a single contract:

```jsonc
{ "type": "bubble_sort", "config": { "array": [5,2,8,1], "stepsToPredict": 5 } }
{ "type": "linked_list", "config": { "nodes": [1,2,3,4] } }
```

- **Backend** keeps a registry mapping `type → strategy`. A strategy knows how to generate/validate its `config`, compute the correct answer, and check a submission. The `daily` and `submissions` modules never know what "bubble sort" is — they just ask the registry.
- **Mobile** keeps a renderer registry mapping `type → component`. `ChallengeRenderer` picks the right 2D view by `type`.
- **The DB** stores the payload in `tasks.config` (JSON), so no schema change is needed to add a type.

**Consequence for you (the AI):** adding a challenge type is a closed, predictable task — one strategy + one renderer. If you find yourself editing `daily`, `submissions`, or the DB schema to add a challenge type, you're doing it wrong.

## 3. Data model and the relationships that matter

The 8 tables (full field list in `prisma/schema.prisma`):
`classes`, `users`, `tasks`, `daily_assignments`, `submissions`, `streaks`, `badges`, `user_badges`.

The relationships that carry the business logic:

- **`submissions` is the center of gravity.** Streak reads it ("did this user complete all of today's tasks?"), the leaderboard aggregates it (sum of weekly points), and admin stats join it through `users → classes`. Three major features flow out of one table — keep it clean and well-indexed (by `user_id`, `task_id`, `created_at`).
- **`daily_assignments` decouples the task bank from the calendar.** A `task` is reusable content; assigning it to a `date` is what makes it "today's task". This is why daily reset is just date filtering, not a job that mutates data.
- **`tasks.config` (JSON) is the seam** that makes the challenge engine generic (see section 2).
- **Leaderboard is not stored** — it's a query. Storing it would create a second source of truth to keep in sync. Recomputing weekly from `submissions` is simpler and always correct.

## 4. Core data flows

### Daily task loop (the heart of the app)
1. Mobile calls `GET /daily`.
2. Backend computes "today" by converting the current UTC instant to GMT+7 and taking the date.
3. Backend reads `daily_assignments` for that date, joins `tasks`, returns each task's `config` **without** the answer.
4. Mobile renders each task via the matching 2D component; user interacts.
5. Mobile calls `POST /submissions` with the user's actions.
6. Backend resolves the strategy by `type`, computes the correct answer from `config`, validates the submission, scores it, stores it (UTC), and rejects duplicates.
7. If this completes ALL of today's tasks, streak logic increments; badge logic may award a badge.

### Why timezone is the riskiest part
Daily systems break subtly when local time and UTC are mixed. A submission at 23:59 and a reset at 00:00 are one minute apart but belong to different "days" — and only if the day is computed consistently in GMT+7. The rule (store UTC, convert at the edges) exists to make this deterministic. These edge cases must be tested early (see `WORKFLOW.md`).

### Auth & RBAC flow
Register (with class selection) → password hashed → stored. Login → JWT issued. Every protected request carries the token; `JwtAuthGuard` authenticates, `RolesGuard` + `@Roles('admin')` authorizes. The two roles (`user`, `admin`) are the assignment's mandatory RBAC; admin endpoints are physically unreachable by users.

## 5. Resilience reasoning (mobile, iOS)

The design question driving mobile resilience is: *"if the app crashes now, what does the user lose?"* Three answers, three mitigations:
- **Session** → token persisted on device (don't force re-login).
- **In-progress attempt** → cached in `sessionStore` (network drop mid-task is recoverable).
- **Streak** → backend-owned, so never lost on the client.

iOS specifically suspends backgrounded apps; the user can leave mid-task and return, so the session store must restore the attempt. Production must be HTTPS because iOS blocks plain HTTP.

## 6. Deployment topology

- Backend → Render (always-on REST API).
- Admin web → Vercel (static SPA hitting the API).
- DB → Google Cloud SQL (managed Postgres).

**Why deploy in week 1, not at the end:** production behaves differently from local in exactly the places that are painful to debug late — CORS, environment variables, auth over HTTPS, Prisma connection to a cloud DB, timezone, and the iOS HTTPS requirement. Deploying as soon as login works surfaces these while they're cheap to fix.

## 7. What is deliberately NOT in the architecture

No realtime/sockets, no microservices, no 3D engine, no caching layer, no message queue. These were considered and rejected because they add production risk without serving the assignment. If a future request implies one of these, treat it as a scope change to raise with the developer, not a default to reach for.
