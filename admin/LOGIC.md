# Admin Panel — Technical Reference

This document covers every file under `admin/src/` and then walks through
the full admin workflow: logging in, creating a task, assigning it to a
date, and viewing class completion stats.

The admin panel is deliberately simple: one entry component (`App.tsx`)
holds all top-level state (auth token, admin name, which tab is active) and
renders one of five page components. There is no router, no global state
library, and no shared component library — each page file is fully
self-contained, including its own inline style objects and any small
presentational helpers (e.g. a `Modal`) it needs.

---

## 1. Entry point

### `src/main.tsx`
The Vite/React entry point. Calls `createRoot(document.getElementById('root')!).render(...)`,
wrapping `<App />` in `<StrictMode>`. Imports `./index.css` (global resets)
before mounting. This is the file `index.html`'s
`<script type="module" src="/src/main.tsx">` loads.

### `index.html`
The single static HTML shell Vite serves. Contains only `<div id="root">`
and the `main.tsx` script tag, plus the favicon link (`/favicon.svg`, served
from `public/`). No other markup — React owns the entire `<body>`.

### `src/App.tsx`
The composition root and the only place page-level state lives:
- `token` (`string | null`) — initialized from `localStorage.getItem('admin_token')`,
  so a page refresh stays logged in. This is the single source of truth for
  "is anyone logged in" — see §6.
- `adminName` (`string`) — initialized from `localStorage.getItem('admin_name')`,
  shown in the top bar avatar/name.
- `page` (`'tasks' | 'classes' | 'assignments' | 'stats'`) — which tab is
  active; defaults to `'tasks'`. This is the entire "routing" mechanism in
  the app — there is no URL-based router, so the URL never changes as the
  admin navigates between tabs, and refreshing the page always lands back on
  Tasks.
- On mount/token-change, an effect calls `setAuthToken(token)` (writes the
  token into `localStorage` again via the API module — see `api.ts`) and
  registers `setUnauthorizedHandler(handleLogout)` — this is the wiring for
  the global 401 flow (§6.3): if any API call ever gets a 401, `api.ts` will
  call this `handleLogout` to kick the admin back to the login screen.
- `handleLogin(t, name)` — persists `t`/`name` to `localStorage`, calls
  `setAuthToken(t)`, and updates `token`/`adminName` state. Passed down to
  `LoginPage` as the `onLogin` prop.
- `handleLogout()` — removes both `localStorage` keys, calls
  `setAuthToken(null)`, and clears `token`/`adminName` state. Used both by
  the sidebar "Log out" button and by the 401 handler registered above.
- If `!token`, renders `<LoginPage onLogin={handleLogin} />` and nothing
  else — there's no "loading" splash state like the mobile app has, since
  reading `localStorage` synchronously in `useState`'s initializer means the
  token (or lack of one) is known on the very first render.
- If `token` is set, renders the main shell: a fixed-width dark sidebar
  (`NAV` array drives the four nav buttons + active-tab highlighting), a top
  bar showing the current page's label and the admin's avatar-initial +
  name, and a `<main>` area that conditionally renders exactly one of
  `TasksPage` / `ClassesPage` / `AssignmentsPage` / `StatsPage` based on
  `page`. All four page components stay unmounted while inactive (only one
  is in the tree at a time), so switching tabs always re-fetches that page's
  data from scratch — there's no cross-tab caching anywhere in this app.

All layout styling here is inline `React.CSSProperties` objects
(`navStyle`, `navBtnBase`, `topBarStyle`) defined at module scope below the
component, the same pattern every page file follows for its own styles.

### `src/App.css`
**Unused.** This is the default Vite+React template stylesheet (`.hero`,
`.counter`, `#next-steps`, `#docs`, etc. — leftover scaffolding for the
template's demo landing page). `App.tsx` never imports it, so none of these
rules apply to the running app. Kept only because it shipped with the
original `create vite` scaffold and was never deleted.

### `src/index.css`
The only stylesheet actually in effect (imported by `main.tsx`). Sets a
box-sizing reset, the page's font stack/background/text color, makes
`#root` a full-height flex container (so `App.tsx`'s `display: flex` sidebar
layout fills the viewport), and a few bare element defaults (`h1`/`h2`/`h3`,
`p`, `code`).

### `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`
**Unused.** Leftover template assets from the default Vite+React scaffold;
nothing in `src/` imports them.

### `public/favicon.svg`
Used — referenced directly by `index.html`'s `<link rel="icon">`.

### `public/icons.svg`
**Unused.** No file references it (checked for both a direct `src`/`href`
and an SVG-sprite-style `#fragment` reference); likely intended as an icon
sprite sheet that was never wired up — every icon actually shown in the app
is a plain emoji character inlined in JSX (e.g. `📋`, `🏫`, `📅`, `📊` in
`App.tsx`'s `NAV` array).

---

## 2. API client — `src/services/api.ts`

The only file any page imports for data access — no page ever constructs a
URL or calls `axios` directly.

- `BASE_URL` reads `import.meta.env.VITE_API_URL`, falling back to
  `http://localhost:3000/api`.
- `api` — the shared `AxiosInstance` (15s timeout, JSON content type).
- **Response interceptor**: on any error with `response.status === 401`,
  calls the registered `_onUnauthorized` callback (set via
  `setUnauthorizedHandler`, called once from `App.tsx` — see §1 and §6.3).
  This is the only place a 401 is detected globally; individual pages still
  have their own local `try/catch` around each call for showing an
  in-page error message, but they don't need to handle "am I logged out
  now" themselves.
- **Request interceptor**: reads `localStorage.getItem('admin_token')`
  directly (not from a closure variable) on every outgoing request and
  attaches `Authorization: Bearer <token>` if present. Reading from
  `localStorage` on every request (rather than capturing the token once)
  means a freshly-logged-in token is picked up immediately without needing
  to recreate the `api` instance.
- `setAuthToken(token)` — write-through helper: writes the token to
  `localStorage` if non-null, removes the key if `null`. Called by
  `App.tsx` on login/logout and by `LoginPage` right after a successful
  login response (slightly redundant with `App.tsx`'s own effect-driven
  call, but harmless — both end up writing the same value).
- Shared types: `TASK_TYPES` (the const tuple `['bubble_sort', 'linked_list',
  'binary_search', 'stack_ops', 'queue_ops']`, used to populate the `<select>`
  in `TasksPage`'s task form) and its derived `TaskType` union; `Task`,
  `Assignment`, `ClassItem`, `ClassStat` interfaces — these mirror what the
  backend returns and are the shapes every page works with.
- Typed endpoint groups, each thin wrappers returning `.then(r => r.data)`:
  - `tasksApi` — `list`, `create`, `update`, `remove` (full CRUD against
    `/tasks`).
  - `classesApi` — `list`, `create`, `update`, `remove` (full CRUD against
    `/classes`).
  - `assignmentsApi` — `listByDate(date?)` (`GET /assignments?date=...`),
    `create(taskId, date)` (`POST /assignments`), `remove(id)`, and
    `generate(date)` (`POST /assignments/generate` — asks the backend to
    auto-populate a default set of assignments for a date that has none
    yet).
  - `statsApi` — `get()` (`GET /stats`, returns `ClassStat[]`).

---

## 3. Pages — `src/pages/`

Each page is a single exported function component plus its own module-scope
style object(s) and, where needed, a small local `Modal` helper (duplicated
across `Tasks.tsx` and `Classes.tsx` rather than shared — there's no common
`components/` folder in this project).

### `Login.tsx` — `LoginPage`
Props: `{ onLogin: (token, name) => void }`. Controlled `email`/`password`
inputs; on submit, calls `api.post('/auth/login', { email, password })`
directly (not through a typed helper in `api.ts`, since auth isn't otherwise
modeled there). After a successful response:
- If `data.user.role !== 'admin'`, sets a local error ("Admin access only.")
  and returns **without** calling `onLogin` — a non-admin account can
  authenticate against the backend but is refused entry to this panel
  client-side. (The token from that response is simply discarded; the
  backend itself doesn't know this request came from the admin panel, so
  this check exists purely to keep non-admin users out of this UI, not as a
  security boundary — actual authorization for any privileged backend
  endpoint is still enforced server-side.)
- Otherwise calls `setAuthToken(data.token)` directly, then `onLogin(data.token,
  data.user.name)`, which is `App.tsx`'s `handleLogin` — see §6.1.
Any thrown error (bad credentials, network failure) is caught generically
and shown as "Invalid credentials."

### `Tasks.tsx` — `TasksPage`
The Challenge Bank CRUD screen. Local helpers:
- `parseConfig(text)` — `JSON.parse`s the config textarea's contents,
  returning `null` (rather than throwing) if it doesn't parse or isn't a
  plain object — used to validate the task config field before submit.
- `fmtDate(iso)` — formats `task.createdAt` for the table.
- `Modal` — a generic backdrop + dialog wrapper (click-outside-to-close via
  comparing `e.target === e.currentTarget`), reused for both the Create and
  Edit dialogs in this file.
- `TaskForm` — a single form component reused for both create and edit
  (parametrized by `values`/`onChange`/`onSubmit`/`submitLabel`/`busy`/
  `configError`/`onConfigChange`), with fields for `type` (a `<select>`
  populated from `TASK_TYPES`), `title`, optional `description`, and a
  monospace `config` JSON textarea.

`TasksPage` itself:
- Fetches `tasksApi.list()` once on mount into `tasks` state.
- **Create flow**: `showCreate` toggles the modal; `createValues` holds the
  form's `TaskFormValues`; on submit, `parseConfig` validates the JSON
  (showing `createCfgErr` and aborting if invalid), then calls
  `tasksApi.create({...})` and prepends the result to `tasks` on success.
- **Edit flow**: `openEdit(task)` seeds `editValues` from the selected task
  (`configText` set via `JSON.stringify(task.config, null, 2)` so the
  existing config is editable as pretty-printed JSON); submit validates and
  calls `tasksApi.update(id, {...})`, replacing the matching entry in
  `tasks` by id.
- **Delete**: a native `window.confirm` guard, then `tasksApi.remove(id)`
  and filters the deleted task out of local state.
- Renders a table of all tasks (id, type, title, a truncated JSON preview of
  `config`, created date, Edit/Delete buttons) with loading/empty states.

### `Classes.tsx` — `ClassesPage`
Structurally identical to `TasksPage` but simpler (no JSON config to
validate — just `name` and `grade` strings): its own local `Modal` (a
near-duplicate of `Tasks.tsx`'s, not shared), separate `useState`s for
create (`newName`/`newGrade`) and edit (`editItem`/`editName`/`editGrade`)
forms, calling `classesApi.list/create/update/remove` and keeping local
`classes` state in sync the same optimistic way (append/replace/filter
without a full refetch).

### `Assignments.tsx` — `AssignmentsPage`
The date-driven scheduling screen — see §6.2 for the full create-and-assign
flow. Notable details:
- `todayStr()` builds a local-timezone (not UTC) `YYYY-MM-DD` string for the
  date `<input type="date">`'s initial value, by reading
  `getFullYear()`/`getMonth()`/`getDate()` directly (deliberately avoids
  `toISOString()`, which would shift the date across midnight in time zones
  ahead of UTC).
- `fmtDate(isoStr)` — for display in the assignments table, just takes the
  date portion before `'T'` from whatever the backend returns.
- Two effects, both with manual retry/backoff and a `cancelled` flag to
  avoid setting state after unmount:
  - **Load tasks once** (`tasksApi.list()`) to populate the "select a task"
    dropdown, retrying up to 3 times with an increasing delay
    (`300 * attempt` ms) before giving up and showing "Failed to load
    tasks."
  - **Reload assignments whenever `date` changes**
    (`assignmentsApi.listByDate(date)`), with the same retry/backoff. If the
    first attempt for a given date comes back with zero assignments, it
    automatically calls `assignmentsApi.generate(date)` and re-fetches —
    this is what makes a freshly-selected date that has nothing assigned
    yet "self-heal" into a populated default set rather than showing an
    empty table (see §6.2).
- `handleAssign` — posts `assignmentsApi.create(selectedTaskId, date)`, then
  (rather than appending the bare creation response, which lacks full task
  details) re-fetches the whole list for that date so the table always shows
  complete `task.type`/`task.title` data. Surfaces the backend's error
  message if present (e.g. "task already assigned to this date") by reaching
  into the caught Axios error's `response.data.message`.
- `handleRemove` — confirm dialog, then `assignmentsApi.remove(id)` and
  filters locally.
- Renders: a date picker, an assign form (task `<select>` + "Assign to
  {date}" button), and a table of that date's assignments with a Remove
  button per row.

### `Stats.tsx` — `StatsPage`
Read-only reporting screen, built on `recharts`.
- `getWeekRange()` — computes the current week's Monday–Sunday range purely
  for the subtitle text ("Week: Mon DD – Sun DD"); this is display-only and
  doesn't get sent to the backend as a filter — `statsApi.get()` takes no
  parameters, so whatever window the stats represent is entirely the
  backend's decision.
- `rateColor(rate)` — green (`≥80%`) / yellow (`50–79%`) / red (`<50%`)
  thresholds, used consistently for the bar chart's bars, the legend, and
  the detail table's rate cell.
- `CustomTooltip` — a Recharts custom tooltip rendering class name, grade,
  completion rate (colored), students completed/total, and submissions/
  points, when hovering a bar.
- `load()` (wrapped in `useCallback` so the "Refresh" button and the mount
  effect share the exact same function) calls `statsApi.get()` into `stats`
  state; the mount `useEffect` just calls `load()` once.
- Renders a `BarChart` (one bar per class, `completionRate` on the y-axis,
  each bar colored via `rateColor`, with a `LabelList` printing the
  percentage above each bar) above a full detail `<table>` (class, grade,
  student counts, a rate cell with both the number and an inline mini
  progress bar, submissions, total points).

---

## 4. Build & tooling config

These aren't app logic, but they shape how the above files are compiled and
served:

- **`vite.config.ts`** — minimal Vite config, just `@vitejs/plugin-react`
  for JSX/Fast-Refresh support. No path aliases, no proxy config (the dev
  server does not proxy `/api` — the app always calls the absolute
  `VITE_API_URL` directly, including in local dev, so the backend must
  allow CORS from the Vite dev origin).
- **`tsconfig.json`** — a "solution" file with no settings of its own; it
  just references `tsconfig.app.json` (for everything in `src/`) and
  `tsconfig.node.json` (for `vite.config.ts` itself), which is the standard
  Vite+TS project-references split so editor tooling and `tsc -b` apply the
  right `lib`/`types` to each.
- **`tsconfig.app.json`** — strict-ish app-side compiler options targeting
  `es2023`/DOM, `moduleResolution: "bundler"`, `noEmit: true` (Vite/esbuild
  does the actual transpilation; `tsc -b` here is purely a type-check gate
  run as part of `npm run build`).
- **`tsconfig.node.json`** — same shape but for Node-side tooling code
  (`vite.config.ts`), with Node types instead of DOM.
- **`eslint.config.js`** — flat ESLint config: `@eslint/js` recommended +
  `typescript-eslint` recommended + `eslint-plugin-react-hooks` recommended
  + `eslint-plugin-react-refresh`'s Vite preset, scoped to `**/*.{ts,tsx}`,
  with `dist` globally ignored.
- **`package.json`** — scripts: `dev` (Vite dev server), `build` (`tsc -b &&
  vite build`), `lint` (`eslint .`), `preview` (serve the built `dist/`
  locally). Dependencies: `react`/`react-dom` 19, `axios`, `recharts`; dev
  dependencies are the Vite/TypeScript/ESLint toolchain — no router, no
  state-management library, no UI kit.

---

## 5. Environment files

- **`.env`** / **`.env.production`** — local, untracked (per `.gitignore`,
  which excludes all `.env*` except `.env.example`); set `VITE_API_URL` to
  the backend the app should talk to.
- **`.env.example`** — the committed template documenting the single
  required variable and where to set it for each environment (local `.env`
  for dev, Vercel project settings for the deployed app).

---

## 6. Full admin workflow

### 6.1 Logging in
1. `App.tsx` mounts and synchronously reads `localStorage.getItem('admin_token')`
   into `token` state (no async bootstrap step, unlike the mobile app — a
   browser reload re-renders `App` from scratch and `localStorage` is read
   inline in the `useState` initializer, so there's no loading flash).
2. With `token === null`, only `<LoginPage onLogin={handleLogin} />` renders.
3. The admin enters email/password and submits. `LoginPage` calls
   `api.post('/auth/login', { email, password })` directly against the
   shared Axios instance (bypassing `api.ts`'s typed helper groups, since
   auth has no dedicated `authApi` export in this file).
4. If the response's `user.role !== 'admin'`, `LoginPage` shows "Admin
   access only." and stops — the received token is never persisted or
   handed to `App.tsx`.
5. Otherwise, `LoginPage` calls `setAuthToken(data.token)` (writes to
   `localStorage` immediately) and then `onLogin(data.token, data.user.name)`,
   which is `App.tsx`'s `handleLogin`: it writes both `admin_token` and
   `admin_name` to `localStorage` again, calls `setAuthToken` again
   (idempotent), and updates `token`/`adminName` React state.
6. `App.tsx` re-renders: `token` is now truthy, so the sidebar + top bar +
   `TasksPage` (the default `page`) render instead of `LoginPage`.
7. The `useEffect` keyed on `token` fires, calling
   `setUnauthorizedHandler(handleLogout)` — wiring the global 401 path (see
   §6.3) for the rest of this session.

### 6.2 Creating a task and assigning it to a date
1. From the sidebar, the admin clicks **Tasks**, setting `App.tsx`'s `page`
   to `'tasks'` and mounting `TasksPage` (which immediately fetches
   `tasksApi.list()` for the table).
2. Clicking **+ New Task** sets `showCreate = true` and resets
   `createValues` to `EMPTY_FORM`, opening the `Modal` containing
   `TaskForm`.
3. The admin fills in `type` (one of the five `TASK_TYPES`), `title`, an
   optional `description`, and a `config` JSON object (e.g.
   `{ "array": [5,3,1,4,2], "stepsToPredict": 5 }` for a `bubble_sort`
   task) into the textarea.
4. On submit, `parseConfig(createValues.configText)` must produce a plain
   object or the form shows "Invalid JSON — must be an object." and stops
   (no request is sent).
5. `tasksApi.create({ type, title, description, config })` posts to
   `POST /tasks`. The backend is solely responsible for validating that the
   config shape actually matches what the chosen `type`'s challenge engine
   expects — this admin panel does no type-specific config validation
   beyond "is it valid JSON shaped like an object."
6. On success, the new `Task` (with its server-assigned `id`/`createdAt`) is
   prepended to local `tasks` state and the modal closes — no refetch of
   the whole list is needed.
7. The admin switches to **Assignments** (`page = 'assignments'`), mounting
   `AssignmentsPage`. Its task-list effect fetches `tasksApi.list()` again
   (independently of `TasksPage`'s own copy — there is no shared cache
   between pages) to populate the "select a task" dropdown, which now
   includes the just-created task.
8. Its date effect fetches `assignmentsApi.listByDate(date)` for whatever
   date is selected (defaulting to today, in local time). If that date has
   zero assignments on the very first load attempt, `AssignmentsPage`
   automatically calls `assignmentsApi.generate(date)` (asking the backend
   to populate a default set) and re-fetches — so a brand-new date doesn't
   just sit empty by default.
9. The admin picks the newly-created task from the dropdown and a date (via
   the `<input type="date">`), then clicks **Assign to {date}**.
   `handleAssign` calls `assignmentsApi.create(taskId, date)` → `POST
   /assignments`. If the backend rejects it (e.g. that task is already
   assigned to that date), the error response's `message` is surfaced
   directly in the page's error banner.
10. On success, `AssignmentsPage` re-fetches `assignmentsApi.listByDate(date)`
    (rather than splicing the bare creation response into state) so the
    table shows the assignment with full nested `task.type`/`task.title`
    data, and resets the task `<select>` back to "— select a task —".
11. The task is now live for that date — the mobile app's `dailyApi
    .getTodayTasks()` (a separate codebase) is what surfaces it to end
    users once that date becomes "today" in GMT+7.

### 6.3 The global 401 / logout flow
Independent of the two flows above, this can interrupt either one at any
point: every request made through the shared `api` Axios instance carries
the bearer token via the request interceptor (reading fresh from
`localStorage` each time). If any response comes back with `status === 401`
(expired/invalid token), the response interceptor invokes whatever callback
was registered via `setUnauthorizedHandler` — which, since `App.tsx`'s
mount/`token`-change effect, is always `handleLogout`. That clears both
`localStorage` keys, calls `setAuthToken(null)`, and resets `token`/
`adminName` state, which makes `App.tsx` render `LoginPage` again. Unlike
the mobile app, there is no separate "parse and display the error" helper
module here — each page's own local `try/catch` around its API calls is
responsible for showing a page-specific error message (e.g. "Failed to load
tasks."), while this interceptor handles the *session-ending* consequence of
a 401 globally, once, regardless of which page triggered it.

### 6.4 Viewing class completion stats
1. The admin clicks **Stats**, mounting `StatsPage`, whose mount effect
   calls `load()` → `statsApi.get()` → `GET /stats`, returning one
   `ClassStat` row per class (`totalStudents`, `studentsCompleted`,
   `completionRate`, `totalSubmissions`, `totalPoints`) — entirely computed
   server-side; this page does no aggregation of its own beyond mapping the
   response into the shape Recharts wants (`chartData`, just the same rows
   with a `name` field aliased from `className`).
2. The bar chart renders one bar per class with `completionRate` as the
   value, each bar colored via the shared `rateColor()` threshold function,
   labeled with its percentage, and a custom tooltip showing the full
   per-class breakdown on hover.
3. A detail table below repeats the same data in tabular form (with an
   inline mini progress bar in the Rate column) for at-a-glance scanning or
   for classes whose bars are hard to compare visually.
4. The **↻ Refresh** button just re-runs the same `load()` function used on
   mount — there's no auto-polling; stats are a manual pull whenever the
   admin wants the latest numbers.
