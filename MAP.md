# MAP.md — Codebase map

> Where everything lives, where to start reading, how a request flows through the system.
> When you need to add a file, find the matching section here first.

## Three projects, one repo (or three sibling repos)

```
backend/    NestJS REST API        → deployed to Render
mobile/     Expo / React Native    → runs in Expo Go on iOS
admin/      React + Vite web       → deployed to Vercel
```

All three talk over HTTPS JSON. The backend is the hub; both clients are thin.

## backend/ (NestJS) — the brain

```
backend/
  src/
    main.ts             # entrypoint: bootstraps Nest, CORS, global filters
    app.module.ts       # root module, wires feature modules
    prisma/
      schema.prisma     # the 8-table data model — START HERE to understand data
      prisma.service.ts # Prisma client provider
    common/
      guards/           # JwtAuthGuard, RolesGuard (RBAC)
      filters/          # global exception filter
      interceptors/     # request logging
      decorators/       # @Roles('admin'), @CurrentUser()
    auth/               # register, login, JWT, password hashing
    modules/
      users/            # user CRUD, profile
      classes/          # class/grade CRUD
      tasks/            # challenge bank CRUD (admin)
      assignments/      # assign tasks to dates (daily_assignments)
      daily/            # GET today's tasks for a user (GMT+7 logic)
      submissions/      # validate + score + store an attempt
      streak/           # streak compute + read
      badges/           # badge definitions + awarding
      leaderboard/      # weekly aggregation query
      stats/            # admin completion stats per class
    challenges/         # THE CHALLENGE ENGINE (data-driven)
      challenge.registry.ts   # maps `type` → strategy
      strategies/
        bubble-sort.strategy.ts
        linked-list.strategy.ts
        # each strategy: generate config, compute answer, validate submission
```

**Backend entrypoints to read in order:** `schema.prisma` (data) → `challenges/challenge.registry.ts` (the core abstraction) → `modules/daily/` and `modules/submissions/` (the main user loop).

## mobile/ (Expo / React Native) — the user client

```
mobile/
  App.tsx               # entrypoint: navigation, providers
  app.json / app.config # Expo config, EXPO_PUBLIC_API_URL
  src/
    screens/
      auth/             # Login, Register (with class selection)
      home/             # Today's tasks
      challenge/        # the screen that hosts a challenge renderer
      leaderboard/
      profile/          # streak, badges
    components/
      challenges/       # PER-TYPE 2D RENDERERS
        BubbleSortView.tsx
        LinkedListView.tsx
        ChallengeRenderer.tsx   # picks renderer by `type`
      common/           # buttons, loading, error, retry UI
    services/
      api.ts            # axios/fetch client, base URL, auth header
      errorHandler.ts   # global API error handling, token-expiry, retry
    hooks/
    store/              # ZUSTAND slices
      authStore.ts      # token, user, role
      cacheStore.ts     # today's tasks, leaderboard snapshot
      sessionStore.ts   # in-progress challenge attempt (recovery)
```

**Mobile entrypoints to read in order:** `services/api.ts` → `components/challenges/ChallengeRenderer.tsx` → `screens/challenge/` → `store/sessionStore.ts`.

## admin/ (React + Vite) — the admin client

```
admin/
  src/
    main.tsx            # entrypoint
    pages/
      Login.tsx
      Tasks.tsx         # CRUD challenge bank
      Classes.tsx       # CRUD classes
      Assignments.tsx   # assign tasks to dates
      Stats.tsx         # completion charts per class/grade
    components/
    services/api.ts     # admin API client (requires admin role)
```

## How a typical request flows

**User solves today's task:**
```
mobile: GET /daily  ──HTTPS──▶ backend daily module
                                  └─ compute "today" in GMT+7
                                  └─ read daily_assignments + tasks
                                  └─ return tasks WITH config, WITHOUT answer
mobile: ChallengeRenderer picks view by `type`, user interacts
mobile: POST /submissions {task_id, actions} ──▶ backend submissions module
                                  └─ challenge registry resolves strategy by type
                                  └─ strategy computes correct answer from config
                                  └─ validate, score, store (UTC), reject duplicate
                                  └─ return correct/incorrect + points
mobile: update sessionStore, cacheStore; maybe streak +1
```

**Admin authors a task:** `admin Tasks.tsx → POST /admin/tasks` (RolesGuard checks admin) → Prisma writes to `tasks`.

## Where to add things (quick rules)

- New challenge type → one backend strategy in `challenges/strategies/` + one renderer in `mobile/.../challenges/`. Nothing else.
- New API endpoint → a NestJS module under `backend/src/modules/`.
- New mobile screen → `mobile/src/screens/` + a route in `App.tsx`.
- New admin page → `admin/src/pages/` + a route in `main.tsx`.
- Shared backend logic (guards, filters) → `backend/src/common/`.
