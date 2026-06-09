# RULES.md — Mandatory technical rules

> These prevent you from breaking the architecture, violating conventions, or over-engineering.
> If a request conflicts with a rule here, stop and flag it to the developer instead of complying.

## A. Architecture rules (hard)

1. **Backend is the only source of truth.** Challenge generation, correct-answer computation, validation, scoring, streak, and leaderboard ALL live in the backend. Never compute correctness or score on the client.
2. **The correct answer never leaves the server before submission.** `GET /daily` returns `config` for rendering but never the solution.
3. **Animation is render-only.** A simulation component may visualize and collect user actions. It must never decide pass/fail or mutate score.
4. **3-tier only.** Client ⇄ REST API ⇄ DB. No direct client→DB access. No extra tiers.
5. **One backend service.** No microservices. No message queues. No WebSocket/realtime.
6. **No 3D.** No `expo-three`, no 3D libraries. 2D only.

## B. Challenge engine rules

7. **Data-driven from challenge #1.** Every challenge is `{ type, config }`. Adding a type = one backend strategy + one frontend renderer. Nothing else.
8. **No scattered type branches.** Forbidden: `if (type === 'bubble_sort') {...} else if (...)` spread across modules. Use the registry/strategy pattern in `challenges/`.
9. **Unknown challenge type must fail gracefully** on the client (fallback UI), never crash.

## C. Time & daily-system rules (highest-risk area)

10. **Store all timestamps as UTC.** Never store local time in the DB.
11. **Convert to GMT+7 only at the edges** — when displaying, or when computing "today" for the daily reset boundary (00:00 GMT+7).
12. **Daily reset** = the API serves the tasks assigned to today's GMT+7 date. There is no cron magic required; it is date filtering.
13. **Streak rule is exact:** +1 only when the user completes ALL of today's tasks; a missed/incomplete day resets to 0.
14. **One scored submission per task per user per day.** Enforce at both service and DB level.

## D. Security rules

15. **Never trust client input.** Validate everything server-side (use NestJS validation pipes/DTOs).
16. **RBAC via guards.** `user` cannot reach `admin` endpoints. Use `@Roles('admin')` + `RolesGuard`. Never check roles ad-hoc inside controllers.
17. **Passwords hashed** (bcrypt or argon2). Never log or return password hashes.
18. **Basic rate limiting** on `/auth/*` and `/submissions`.
19. **Secrets only via env vars.** Never hardcode tokens, DB URLs, or keys. Never commit `.env`.

## E. Mobile rules

20. **Persist the auth token** so reopening the app doesn't force re-login.
21. **Cache the in-progress attempt** in `sessionStore` so a network drop mid-task doesn't lose the user's work.
22. **Every network call has** loading, error, and retry states. Use the global error handler; handle token expiry centrally.
23. **HTTPS only** for the production API (iOS blocks HTTP).
24. **State lives in Zustand slices** (`auth`, `cache`, `session`) — do not scatter global state across contexts.

## F. Code & convention rules

25. **TypeScript everywhere.** No `any` unless truly unavoidable and commented why.
26. **Stick to the chosen stack.** Do NOT add a new library to solve something the stack already covers. If you think a new dependency is genuinely needed, propose it to the developer with a one-line reason — do not just add it.
27. **Follow the folder map** in `MAP.md`. New code goes where the map says.
28. **Small, reviewable changes.** Implement one vertical slice; don't refactor unrelated code in the same change.
29. **No dead code, no commented-out blocks left behind, no TODO without a note in `MEMORY.md`.**

## G. Anti-over-engineering (the spirit of the project)

30. **Ship-able beats clever.** A simple working solution always wins over an elegant unfinished one.
31. **Do not add:** caching layers, abstractions for one use case, generic frameworks, premature optimization, config systems nobody asked for.
32. **From mid-month, stop adding features** — prioritize stability, UX, bug-fixing, loading/retry polish over new capability.
33. **When in doubt, build less.** Ask the developer before expanding scope.
