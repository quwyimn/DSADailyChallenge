# Mobile — Technical Reference

This document covers every file under `mobile/src/`, plus `App.tsx` and
`app.json`, and then walks through the end-to-end flow from app launch to
completing a daily challenge.

Golden rules this client is built to respect (see root `CLAUDE.md`):
backend is the only source of truth for correctness/scoring; the client never
trusts itself for validation; animation is render-only; no 3D/sockets/
over-engineering; time is stored in UTC and only converted to GMT+7 for
"what is today" display logic; the challenge engine dispatches on a `type`
string through a lookup table, never an `if/else` chain.

---

## 1. Entry point and root files

### `index.ts`
Calls `registerRootComponent(App)` from `expo`. This is the actual JS entry
point referenced by `package.json`'s `"main": "index.ts"` — it registers
`App` as the root component for both Expo Go and native builds.

### `App.tsx`
The composition root. Responsibilities:
- Declares all React Navigation param-list types used across the app:
  `AuthStackParamList` (Login, Register), `RootStackParamList` (Home,
  Subject, Challenge, Leaderboard, Profile — used by the "Bài tập" tab's
  stack), `LearnStackParamList` (LearnHome, LearnDetail — used by the
  "Minh họa" tab's stack), and `MainTabParamList` (the two bottom tabs).
  Every screen imports its param-list type from here.
- Builds three native-stack navigators (`AuthStack`, `BaiTapStack`,
  `LearnStack`) and one bottom-tab navigator (`Tab`).
- At module scope (i.e. once, at import time, outside any component), calls
  `registerUnauthorizedHandler(() => useAuthStore.getState().logout())` from
  `src/services/api.ts`. This is the single wire-up point for the global 401
  flow — see §5 below. It's done at module scope specifically to avoid a
  circular import between `api.ts` and `authStore.ts`.
- `MainNavigator()` renders the persistent `AppHeader` above a bottom-tab
  navigator with two tabs: **BaiTap** (`BaiTapStackNavigator`, the daily
  challenges flow) and **MinhHoa** (`LearnStackNavigator`, the illustration
  flow). Tab labels come from `useLanguageStore`.
- The default-exported `App()` component:
  1. Reads `token`, `isNewUser`, `setTokenOnly` from `authStore`, and
     `allTasksCompletedToday` from `cacheStore`.
  2. On mount, calls `getStoredToken()` (from `api.ts`) and, if a token is on
     disk, calls `setTokenOnly(token)` to hydrate it into memory — this is
     **session restoration**, distinct from a fresh login (see §4).
  3. Until that bootstrap check resolves, renders a full-screen
     `ActivityIndicator` instead of any navigator (avoids flashing the login
     screen for a moment before the stored token is checked).
  4. Once bootstrapped, renders `SafeAreaProvider` → `StatusBar` →
     `ErrorBoundary` → `NavigationContainer`, switching between
     `MainNavigator` (if `token` is set) and `AuthStack` (if not).
  5. Three overlays are rendered as siblings of `NavigationContainer`, inside
     `ErrorBoundary`, only when logged in: `ProfileSheet` (always mounted,
     visibility controlled by `uiStore`), `WelcomeOverlay` (only if
     `isNewUser`), `CompletionOverlay` (only if
     `cacheStore.allTasksCompletedToday`).

### `app.json`
Expo config. App name/slug `mobile`, portrait-only, light UI style. iOS:
`supportsTablet: true` (no other iOS-specific config — no custom URL scheme,
no push entitlements). Android: adaptive icon set + `predictiveBackGestureEnabled:
false`. Web: favicon only. Plugins: `expo-secure-store` (required for the
native SecureStore module used by `src/services/api.ts`).

---

## 2. Services — `src/services/`

### `api.ts`
The single Axios instance and all typed API calls. Structure:
- `BASE_URL` reads `process.env.EXPO_PUBLIC_API_URL`, falling back to
  `http://localhost:3000/api`.
- `api` — the shared `AxiosInstance` with a 15s timeout and JSON content type.
- **Request interceptor**: calls `getStoredToken()` on every outgoing request
  and attaches it as `Authorization: Bearer <token>` if present. This means
  every API call automatically carries auth — callers never set headers
  manually.
- **Response interceptor**: on any error response with `status === 401`,
  invokes a module-level `_onUnauthorized` callback (set via
  `registerUnauthorizedHandler`, called once from `App.tsx`). This is the only
  place a 401 is detected; every screen/component that calls the API benefits
  from this without writing its own 401 handling.
- Token persistence functions `persistToken` / `clearToken` /
  `getStoredToken`: use `expo-secure-store` on native, `localStorage` on web
  (the web build of `expo-secure-store` is a stub object whose methods throw,
  so `Platform.OS === 'web'` is checked explicitly).
- Shared response/request TypeScript interfaces: `AuthUser`, `AuthResponse`,
  `ClassItem`, `DailyTask`, `DailySubject`, `AttemptHistoryEntry`,
  `SubmissionResult`, `LeaderboardEntry`, `LeaderboardResponse`,
  `UserProfile`, `DailyHistoryEntry`, `StreakData`, `BadgeItem`,
  `BreakdownItem`, `TodaySummary` — these are the contract every screen and
  store relies on; they mirror what the NestJS backend returns.
- Typed endpoint groups, each a thin wrapper returning `.then(r => r.data)`:
  `authApi` (login/register/me), `classesApi` (list), `usersApi` (me,
  profile), `dailyApi` (getTodayTasks), `submissionsApi` (submit,
  todaySummary), `streakApi` (get), `badgesApi` (get), `leaderboardApi`
  (get). Every screen and challenge view imports from this module rather than
  calling `api` directly — it's the only file that knows REST paths.

### `errorHandler.ts`
`parseApiError(error: unknown): ApiError` — a pure function (no side effects,
does **not** trigger logout) that turns any thrown value into a
`{ message, statusCode }`. Handles three cases:
- `AxiosError` with `status === 401` → canned "Session expired" message (the
  actual logout already happens via the `api.ts` interceptor, independently).
- Other `AxiosError`s → unwraps NestJS's nested exception shape. NestJS's
  built-in `HttpException`s serialize as `{ statusCode, message, error }`, and
  the backend's `GlobalExceptionFilter` nests that whole object as the
  response body's own `message` field, so `extractMessage()` recursively
  unwraps until it finds a plain string (or joins an array of validation
  messages).
- Plain `Error` / unknown → generic fallback message.

Used by `useApi` (the shared async hook) and directly inside every challenge
view's manual submit handlers.

---

## 3. State — `src/store/` (Zustand)

### `authStore.ts`
Holds `token`, `user`, `isLoading`, `justLoggedIn`, `isNewUser`.
- `setAuth(token, user)` — full login/register path: persists the token to
  disk (`persistToken`) and sets `justLoggedIn: true` (drives a "fresh login"
  distinction, though nothing currently branches on it besides existing as a
  flag — `isNewUser` is what actually triggers the welcome flow).
- `setTokenOnly(token)` — app-bootstrap path: token is already on disk, so
  this only hydrates memory state, without re-writing SecureStore and without
  setting `justLoggedIn`. This is what session restoration calls (§4).
- `setUser(user)` — hydrates the `user` object once it's fetched (used by
  `HomeScreen` after `setTokenOnly`, since the token alone doesn't carry user
  data).
- `logout()` — clears the on-disk token, resets `cacheStore`, `sessionStore`,
  and `uiStore` (so no stale data from the previous account survives a
  re-login), then clears `token`/`user`/`justLoggedIn`/`isNewUser` in this
  store. This is the single function that the 401 interceptor and every
  manual "Log out" button call.
- `setIsNewUser(v)` — set to `true` by `RegisterScreen` right after a
  successful registration, which is what makes `App.tsx` mount
  `WelcomeOverlay`.
- `clearJustLoggedIn()` — called by `WelcomeOverlay` when the user finishes
  the welcome carousel.

### `cacheStore.ts`
Caches data fetched on `HomeScreen` so other screens (`SubjectScreen`,
`ChallengeScreen`) don't need to re-fetch: `todayTasks` (the day's
`DailySubject[]`), `leaderboardData`, `lastFetchedDate` (an ISO date string
used to invalidate `todayTasks` once a new day starts), `pointsToday`,
`streakCurrent`, `dailyHistory`, `latestBadge`, `allTasksCompletedToday`.
- `setTodayTasks(tasks, date)` — stores tasks alongside the date they were
  fetched for, so `HomeScreen` can compare against "today" (GMT+7) and decide
  whether to refetch.
- `incrementAttempts(taskId)` — after a successful submission, bumps
  `attemptsToday` for that one task inside the cached `todayTasks` tree (deep
  map over subjects → tasks) so `SubjectScreen`'s lock/dot UI updates
  immediately without a network round-trip.
- `addPoints(points)` — optimistically bumps `pointsToday` (only called when
  the submission was correct, the first attempt, and awarded > 0 points — see
  §4 step 6).
- `clearCache()` / `reset()` — identical implementations that zero out
  everything except `latestBadge`; `reset()` is what `authStore.logout()`
  calls. `clearCache()` exists on the interface but currently has no caller
  (no daily-rollover invalidation is wired to it yet — `HomeScreen` instead
  relies on comparing `lastFetchedDate` to "today").

### `sessionStore.ts`
Per-challenge-attempt scratch state, intentionally separate from `cacheStore`
because it's reset every time a `Challenge` screen mounts/unmounts rather
than persisted across the day: `activeTaskId`, `activeTaskType`,
`capturedActions` (raw list of every UI action taken, used only for the
"N hành động đã ghi nhận" footer hint — not sent anywhere as-is),
`submissionResult` (the last `SubmissionResult` from the backend, so
re-rendering the same mounted `Challenge` screen shows the result instead of
resetting to the prediction phase).
- `setActiveTask(taskId, taskType)` — called by `ChallengeScreen` on mount;
  also clears `capturedActions` and `submissionResult` from any previous task.
- `appendAction(action)` — called from `ChallengeScreen`'s
  `onActionCaptured` prop, which every `*View` component invokes as the user
  interacts.
- `clearSession()` / `reset()` — identical; `clearSession()` runs on
  `ChallengeScreen` unmount (its `useEffect` cleanup), `reset()` runs on
  `authStore.logout()`.

### `languageStore.ts`
A single `t(key)` translator function bound to the Vietnamese dictionary in
`src/i18n/translations.ts` (`vi[key] ?? key`, so an unknown key renders as
itself rather than crashing — useful safety net during development). There is
currently only one locale; the store exists so screens call
`useLanguageStore().t(...)` uniformly and a second locale could be added later
without touching call sites.

### `uiStore.ts`
Tiny store for cross-cutting UI state that doesn't belong to any one screen:
`profileSheetVisible`, toggled by `AppHeader`'s avatar button and read by
`ProfileSheet` (mounted once, globally, in `App.tsx`). `reset()` is called on
logout so the sheet doesn't reopen mid-transition to the auth stack.

---

## 4. Hooks — `src/hooks/useApi.ts`

`useApi<T>()` is the shared async-call wrapper used by most screens (the
challenge views manage their own submit state manually instead, since they
need finer control — see §6). Returns `{ data, loading, error, execute, retry,
clearError }`.
- `execute(fn)` stores `fn` in a ref (so `retry()` can replay the exact same
  call), sets `loading: true`, awaits it, and on failure calls
  `parseApiError` to populate `error` as a plain string.
- `retry()` re-invokes the last `execute`d function — wired to the "Thử lại"
  button inside `ErrorBanner`.
- `clearError()` only clears the error string, leaving `data`/`loading`
  untouched.

---

## 5. i18n — `src/i18n/translations.ts`

A flat `vi` object mapping dotted keys (`'auth.login.title'`, etc.) to
Vietnamese strings, with `{placeholder}` tokens manually substituted by
callers via `.replace()` (no templating engine — deliberately the simplest
thing that works, per the file's own header comment). `TranslationKey` is
`keyof typeof vi`, so every `t('...')` call site is statically checked against
this dictionary. Organized into commented sections matching feature areas
(AUTH, HOME, SUBJECT, CHALLENGE, per-challenge-type sections, LEARN tab and
per-algorithm learn sections, LEADERBOARD, PROFILE, COMMON, TAB LABELS,
WELCOME OVERLAY).

---

## 6. Common components — `src/components/common/`

### `ScreenWrapper.tsx`
Wraps every screen's content in a `SafeAreaView` with a light background
(`#f8fafc`), optional horizontal padding (`padded`, default `true`), and an
optional `BackButton` row (`showBack`). Nearly every screen renders its body
inside this.

### `BackButton.tsx`
A `‹` pressable that calls `navigation.goBack()` if possible, or navigates to
a `fallbackRoute` (default `'Home'`) otherwise — needed because a screen can
be the first one in its stack (e.g. reached via a deep link or Expo Web
direct URL) and have nothing to go back to. Typed against the union of all
three stacks' param lists so it type-checks from any screen regardless of
which stack mounted it.

### `Avatar.tsx`
Renders the user's `avatarUrl` as an `Image` if present and not errored
(`onError` flips `imgError` to fall back), otherwise a colored circle with
the first letter of their name. The background color is deterministically
picked from `name.charCodeAt(0) % COLORS.length`, so the same name always
gets the same color across screens. Used by `AppHeader`, `ProfileSheet`,
`ProfileScreen`, `LeaderboardScreen`.

### `AppHeader` — see §7 (navigation), included there since it's navigation-adjacent.

### `LoadingOverlay.tsx`
A centered `ActivityIndicator` with an optional message and an optional
`fullScreen` mode (flex:1 + white background, used by `HomeScreen` while
restoring the session).

### `ErrorBanner.tsx`
A red-tinted box showing an error `message` with optional `onRetry` and
`onDismiss` buttons. Used wherever `useApi`'s `error` is non-null.

### `ErrorBoundary.tsx`
A class component (required — error boundaries can't be hooks) that catches
any uncaught render-time error thrown by its subtree (wraps the entire
`NavigationContainer` + overlays in `App.tsx`), logs it via `console.error`
(no third-party crash reporting, per project rules), and renders a "Restart"
fallback screen instead of a blank/crashed app. `handleRestart` just clears
`hasError`, re-rendering the previously-crashed subtree from scratch.

### `WelcomeOverlay.tsx`
A 4-page full-screen carousel shown only when `authStore.isNewUser` is true
(set by `RegisterScreen` right after registration). Purely local UI state
(`pageIndex`, a slide `Animated.Value`, and a one-shot confetti burst on page
1) — it doesn't call any API. The last page's button calls
`setIsNewUser(false)` and `clearJustLoggedIn()`, which removes the overlay
since `App.tsx` only mounts it while `isNewUser` is true.

### `CompletionOverlay.tsx`
A full-screen "all done for today" card with confetti, shown by `App.tsx`
whenever `cacheStore.allTasksCompletedToday` is `true` (set by `HomeScreen`
once `totalDone === totalAvailable`, see §8 step 7). Shows `pointsToday` from
`cacheStore` and a hard-coded weekly schedule table (`TOMORROW_SCHEDULE`,
duplicated from the same table in `HomeScreen.tsx` — both compute "what
topics are next" from `(weekday + 1) % 7` style logic, entirely client-side
and cosmetic). Closing it sets `allTasksCompletedToday` back to `false` (it is
not persisted — reappearing requires `totalDone === totalAvailable` to be
re-derived, which happens again next time `HomeScreen` mounts with a fully
completed day).

### `ProfileSheet.tsx`
A bottom-sheet `Modal`, mounted once globally in `App.tsx`, visibility driven
by `uiStore.profileSheetVisible` (opened by `AppHeader`'s avatar button).
While visible, fetches `streakApi.get()`, `badgesApi.get()`, and
`leaderboardApi.get()` (reusing `cacheStore.leaderboardData` if already
present, to avoid a redundant call) in parallel, and shows: user row, a
streak/badge-count summary with a link to the full `Profile` screen, a
top-3 mini-leaderboard with a link to the full `Leaderboard` screen, and a
logout button. `navigate()` closes the sheet first, then defers the actual
`navigationRef.current.navigate(...)` by 150ms so the close animation doesn't
visually fight the screen transition.

---

## 7. Navigation component — `src/components/navigation/AppHeader.tsx`

Rendered once, above the bottom-tab navigator, by `MainNavigator` in
`App.tsx`. Shows the "DSA Daily" brand mark and the current user's `Avatar`
inside a tappable ring that opens `ProfileSheet` via
`uiStore.setProfileSheetVisible(true)`. This is the only header shown across
both tabs — individual screens manage their own in-content headers (e.g.
`SubjectScreen` and `ChallengeScreen` render their own title rows with a
`BackButton`).

---

## 8. Challenge engine — `src/components/challenges/`

This is the data-driven dispatch engine required by the project's golden
rules: the renderer picks a component by `type` string via a lookup table,
never an `if (type === ...)` chain, so adding a new challenge type later only
means adding one more `*View` component and one map entry.

### `ChallengeRenderer.tsx`
```ts
const RENDERERS: Record<string, React.ComponentType<ChallengeRendererProps>> = {
  bubble_sort: BubbleSortView,
  linked_list: LinkedListView,
  binary_search: BinarySearchView,
  stack_ops: StackOpsView,
  queue_ops: QueueOpsView,
};
```
Given `{ type, config, onActionCaptured }`, looks up `RENDERERS[type]` and
renders it with the same props; if `type` isn't in the map, renders a plain
"Unknown challenge type" message instead of crashing — this means a backend
that ships a new challenge type before the client is updated degrades
gracefully rather than breaking the app. Used exclusively by
`ChallengeScreen`.

### `AttemptHistory.tsx`
A presentational list of this task's attempts so far today
(`AttemptHistoryEntry[]` from the submission response), each row showing
correct/incorrect, points, and a "best" tag on the highest-scoring attempt,
plus a row of dots showing attempts used vs. `maxAttempts`. Rendered at the
bottom of every challenge view's result state (`BubbleSortView`,
`LinkedListView`, `BinarySearchView`, `StackOpsView`, `QueueOpsView` all embed
it identically).

### `BubbleSortView.tsx`
Config: `{ array: number[], stepsToPredict: number }`. For each adjacent pair
in bubble-sort order (computed locally by `getStepPair`, which mirrors the
backend's own step generation purely for *display* — it does not decide
correctness), the user predicts "Swap" or "No swap" with a small scale-bounce
animation; `recomputeArray` replays the user's own choices locally just to
keep the on-screen array array visually in sync with what they've predicted
so far. Each choice is appended both to local `actions` state and (via
`onActionCaptured`) to `sessionStore.capturedActions`. Once
`stepIndex >= stepsToPredict`, shows a Submit button that calls
`submissionsApi.submit(activeTaskId, actions)` — the actual correctness check
happens entirely server-side; the local "is this actually a swap" logic is
purely cosmetic until that POST resolves. On a successful response: stores
the `SubmissionResult` in both local state and `sessionStore`, calls
`cacheStore.incrementAttempts(taskId)`, and — only if `isCorrect && attemptsUsed
=== 1 && points > 0` — calls `cacheStore.addPoints(points)` (so retried
correct answers on a later attempt don't double-count points the backend
already decided not to award). On success it also re-fetches
`badgesApi.get()` to catch a newly-unlocked badge. "Try again" resets all
local state back to the predicting phase (allowed only while
`attemptsUsed < maxAttempts`).

### `LinkedListView.tsx`
Config: `{ nodes: number[], operation, targetIndex?, insertValue?, points? }`,
where `operation` is one of `delete_head | delete_tail | delete_at |
delete_middle | insert_head | insert_tail | insert_at | reverse`.
`computeCorrectAnswer()` mirrors what each operation should produce —
again purely so the result screen can show "đáy đúng: [...]" next to a wrong
answer; the backend independently determines `isCorrect`. For delete/insert
ops the user taps a node or an insertion "slot" (`PositionSlot`) to select a
position, then confirms; for `reverse` a single button reverses the working
list locally. `handleSubmit` posts a single action `{ result: workingNodes }`
to `submissionsApi.submit`. Same incrementAttempts/addPoints/badge-refresh
pattern as `BubbleSortView`.

### `BinarySearchView.tsx`
Config: `{ array: number[], target: number, targetExists: boolean, points?
}`. The user taps array cells in the order they believe binary search would
probe them; each tap appends a `{ mid }` action. `searchLeft`/`searchRight`
are derived locally (via `useMemo`) by replaying the user's own taps against
standard binary-search bounds-narrowing — purely to color which cells are
still "in range" as visual guidance, not to validate anything. `computeCorrectMids`
similarly mirrors the canonical algorithm only to display the correct
sequence after a wrong submission. Submits the whole `actions` array (one
entry per tap) to `submissionsApi.submit`.

### `StackOpsView.tsx`
Config: `{ operations: {op: 'push'|'pop', value?}[], stepsToPredict: number
}`. `computeAllStates` precomputes the correct stack content *before* and
after each operation (again, for local UI/animation purposes — labeled
explicitly in a comment as mirroring the backend, not replacing it). At each
step the user sees the op (`PUSH n` / `POP`) and the stack before it, and
types the predicted resulting stack contents into per-slot `TextInput`s
(bottom-to-top order, rendered as a visual stack with a closed base). Each
confirmed step appends `{ step, stack }` to `actions`; final submit posts the
whole `actions` array.

### `QueueOpsView.tsx`
Config: `{ operations: {op: 'enqueue'|'dequeue', value?}[], stepsToPredict:
number }`. Mirrors `StackOpsView` but FIFO: `computeQueueAllStates`
precomputes states the same way, the user types the predicted queue contents
after each enqueue/dequeue into `TextInput`s, with basic input validation
(`queueOps.invalidInput` if any cell isn't a number). Each confirmed
prediction (a plain `number[]`) is pushed into `actions`; submit posts the
full array.

All five challenge views share the same shape of side effects on submit:
`submissionsApi.submit` → `setSubmissionResult` (session) → `setPhase('result')`
→ `cacheStore.incrementAttempts` → conditionally `cacheStore.addPoints` →
conditionally re-fetch `badgesApi.get()` → conditionally allow "Try again" if
`attemptsUsed < maxAttempts`. This repetition is the cost of giving each
challenge type its own bespoke prediction UI; only the *interaction* differs
per type, the *result-handling* is identical across all of them.

---

## 9. Learn (illustration) components — `src/components/learn/`

These power the **Minh họa** tab — five purely client-side, non-scored,
step-by-step demos. None of them call the API; each precomputes its full step
sequence once (via a `computeSteps`-style function) and a tiny `StepControls`
component pages through it.

### `StepControls.tsx`
Prev/Next buttons + a "Bước n / total" counter, disabling Prev on the first
step and Next on the last. Used identically by all five demo components.

### `SectionHeader.tsx`
A small uppercase label with a colored underline, used by `LearnDetailScreen`
to separate "Khái niệm" / "Cách hoạt động" / "Demo tương tác" / "Độ phức tạp"
sections.

### `ComplexityTable.tsx`
Renders a list of `{ title, badges: {label, value, variant}[] }` rows as
colored pill badges (`variant` ∈ `best | average | worst | plain` maps to a
green/yellow/red/gray palette). Fed per-algorithm complexity data from
`LearnDetailScreen`'s `getContent()`.

### `BubbleSortDemo.tsx`
Demo array `[5, 3, 8, 1, 9, 2]`. `computeAllSteps` precomputes every
comparison bubble sort would make (mirrors `BubbleSortView`'s
`getStepPair`/loop structure, but exhaustively, since this is illustrative
rather than interactive-prediction). Steps through with cell scale-bounce,
horizontal shake on swap, and a background color animation for cells that
have reached their final sorted position.

### `LinkedListDemo.tsx`
A fixed 5-step scripted walkthrough of deleting the node at index 2 from
`[10, 20, 30, 40, 50]` (not derived from any config — the steps and their
node states/labels are hand-authored in `getSteps()`), demonstrating
prev/current pointers, the node being deleted, and the "bypass" pointer
rewire (`prev.next = node.next`).

### `BinarySearchDemo.tsx`
Array `[2, 5, 8, 12, 16, 23, 38, 45, 67, 72, 91]` with a toggle between a
"found" search (target `23`) and a "not found" search (target `50`).
`computeSteps` mirrors the same low/high/mid narrowing logic as
`BinarySearchView`'s correctness preview, fully precomputed for both targets.
Animates per-cell opacity (eliminated vs. in-range), a range-width progress
bar, and a scale/border pulse on the current `mid` cell.

### `StackOpsDemo.tsx` / `QueueOpsDemo.tsx`
Free-play (not scripted/stepped) demos — the user presses PUSH/POP (stack) or
ENQUEUE/DEQUEUE (queue) buttons directly, up to a max size of 6, with
spring-in / fade-and-slide-out animations for the entering/exiting cell.
Unlike the other three demos these have no precomputed step list; they're
just a live, freely-interactive LIFO/FIFO sandbox.

---

## 10. Screens — `src/screens/`

### `auth/LoginScreen.tsx`
Email + password form. Uses `useApi` to call `authApi.login`; on success,
calls `authStore.setAuth(token, user)` — which persists the token and flips
`App.tsx` from the auth stack to the main tab navigator. Links to `Register`.

### `auth/RegisterScreen.tsx`
Name + email + password + optional class picker (fetched once via
`classesApi.list()` on mount, fails silently if it errors since class
selection is optional). On success calls `setAuth(...)` and then
`setIsNewUser(true)`, which is what makes `WelcomeOverlay` appear once the
main app mounts.

### `home/HomeScreen.tsx`
The most stateful screen; orchestrates most of `cacheStore`'s population.
- If `token` is set but `user` is `null` (the session-restoration case — see
  §11), calls `authApi.me()` to hydrate `user`, or `logout()` if that fails
  (e.g. token expired/revoked while the app was closed).
- Once `user` is known, fetches `dailyApi.getTodayTasks()` — but only if
  `cacheStore.lastFetchedDate` isn't already today (computed in GMT+7 via
  `getHcmDateString()`, per the project's UTC-storage/GMT+7-display rule) or
  `todayTasks` is empty — avoiding a refetch on every remount within the same
  day.
- Separately fetches `submissionsApi.todaySummary()` + `streakApi.get()`
  together (only if any of `pointsToday`/`streakCurrent`/`dailyHistory` is
  still `null`), and `badgesApi.get()` (always, to keep "latest badge"
  fresh) — each independently cached/guarded so navigating back to Home
  doesn't re-trigger every fetch.
- Derives `totalDone`/`totalAvailable` from `todayTasks` and, when they're
  equal and `totalAvailable > 0`, sets `cacheStore.allTasksCompletedToday =
  true` (which is what makes `App.tsx` show `CompletionOverlay`).
- Renders: greeting + streak/points pills (points pill opens a breakdown
  modal sourced from `submissionsApi.todaySummary()`'s `breakdown` field),
  an overall progress bar, one card per subject (with a "Start/Continue/
  Review" button navigating to `Subject`), a tappable 7-day GMT+7 week
  calendar (✓/✗/🔥/? per day, backed by `dailyHistory`), and the latest
  badge card if any.

### `challenge/SubjectScreen.tsx`
Receives the full `subject: DailySubject` object as a navigation param (not
just an id — avoids a redundant fetch). Lists its `tasks`, each shown with a
difficulty badge, attempt dots, and locked (greyed out, undisablable) once
`attemptsToday >= 3`. Tapping an unlocked task navigates to `Challenge` with
just `{ taskId }`.

### `challenge/ChallengeScreen.tsx`
Receives `{ taskId }` and looks the full task object up from
`cacheStore.todayTasks` (flattened across subjects) rather than re-fetching —
this only works because `SubjectScreen`/`HomeScreen` already populated the
cache. On mount, calls `sessionStore.setActiveTask(task.id, task.type)`; on
unmount, `clearSession()`. Renders `ChallengeRenderer` with the task's `type`
and `config`, plus an `onActionCaptured` callback wired straight to
`sessionStore.appendAction`. If the task can't be found in the cache (e.g.
deep-linked or cache was cleared), shows a "Không tìm thấy bài tập" message
instead of crashing.

### `leaderboard/LeaderboardScreen.tsx`
Fetches `leaderboardApi.get()` via `useApi` on mount and caches the result in
`cacheStore.leaderboardData` (so `ProfileSheet`'s mini-leaderboard can reuse
it without a second call). Renders a `FlatList` of entries with medal styling
for the top 3, the current user's row highlighted, and a footer card if the
current user's rank is outside the top 50.

### `profile/ProfileScreen.tsx`
Independent of `cacheStore` — fetches its own `streakApi.get()` +
`badgesApi.get()` directly on mount (with simple local `loading`/`error`
state, not `useApi`) whenever `user.id` is available. Shows a streak "hero"
stat, a badge grid (icon/color looked up by badge `key` from local
`BADGE_ICON`/`BADGE_COLOR` maps, falling back to a generic tag emoji for
unrecognized keys — keeps the screen forward-compatible with new badges the
client doesn't have custom art for yet), and a logout button.

### `learn/LearnHomeScreen.tsx`
Static list of the five algorithms (`CARDS`, hard-coded — there's no backend
content here, it's purely illustrative), each navigating to `LearnDetail`
with `{ algorithm }`.

### `learn/LearnDetailScreen.tsx`
`getContent(t)` returns a `Record<Algorithm, AlgorithmContent>` built fresh
on every render (so content re-translates if `t` ever changes) containing the
concept text, numbered "how it works" steps, and complexity table rows for
whichever `algorithm` param was passed. `renderDemo(algorithm)` is the
illustration tab's own small data-driven dispatch (a `switch`, functionally
equivalent to `ChallengeRenderer`'s lookup table, but for the five
non-scored `*Demo` components instead of the five scored `*View` components).

---

## 11. End-to-end flow: app launch → completing a daily challenge

1. **Process start.** `index.ts` calls `registerRootComponent(App)`. Expo
   mounts `App.tsx`'s default export.

2. **Bootstrap / session restoration.** `App()`'s mount effect calls
   `getStoredToken()` (`SecureStore` on iOS/Android, `localStorage` on web).
   - If a token exists on disk, `authStore.setTokenOnly(token)` puts it into
     memory **without** re-persisting it and **without** setting
     `justLoggedIn` — this is what distinguishes "I was already logged in"
     from "I just logged in right now" elsewhere in the app (e.g.
     `isNewUser`/welcome-flow logic only ever gets set explicitly by
     `RegisterScreen`, never implied by token presence).
   - Either way, `bootstrapped` flips to `true`. Until then, a bare
     `ActivityIndicator` is shown — no flash of the login screen.

3. **Top-level routing.** With `bootstrapped === true`:
   - `token === null` → `AuthStack` (Login/Register) renders.
   - `token` present → `MainNavigator` renders (bottom tabs + `AppHeader`),
     plus the three always-mounted-when-logged-in overlays (`ProfileSheet`,
     conditionally `WelcomeOverlay`/`CompletionOverlay`).
   - Note: at this point `authStore.user` is still `null` if we came from
     session restoration (only the token was restored, not the user object).

4. **Home mounts, user hydration.** `HomeScreen`'s first effect notices
   `token && !user` and calls `authApi.me()` → `authStore.setUser(user)`. If
   that call fails (expired/revoked token), it calls `logout()` directly —
   this is a *second*, independent path to logout besides the 401
   interceptor (defensive: covers the case where `me()` fails for a reason
   that isn't strictly a 401, though in practice it usually will be). While
   `user` is still `null`, `HomeScreen` renders nothing but a full-screen
   "Đang khôi phục phiên…" `LoadingOverlay`.

5. **Daily data load.** Once `user` is set, `HomeScreen` fires its
   today's-tasks effect (`dailyApi.getTodayTasks()` → `cacheStore
   .setTodayTasks(subjects, todayGmt7)`), its points/streak/history effect
   (`submissionsApi.todaySummary()` + `streakApi.get()` →
   `cacheStore.setPointsToday/setStreakCurrent/setDailyHistory`), and its
   badges effect (`badgesApi.get()` → `cacheStore.setLatestBadge`). Each is
   individually guarded so remounting `HomeScreen` later the same day doesn't
   refetch.

6. **Drilling into a challenge.** User taps a subject card → `Subject`
   screen (receives the already-fetched `subject` object as a param, no
   fetch). Taps an unlocked task (`attemptsToday < 3`) → `Challenge` screen
   with `{ taskId }`.

7. **Challenge session setup.** `ChallengeScreen` looks the task up from
   `cacheStore.todayTasks` and calls `sessionStore.setActiveTask(task.id,
   task.type)`, which resets `capturedActions`/`submissionResult` for this
   fresh attempt. It renders `ChallengeRenderer({ type: task.type, config:
   task.config, onActionCaptured })`.

8. **Type dispatch.** `ChallengeRenderer` looks up `task.type` (a plain
   string like `'bubble_sort'`) in its `RENDERERS` map and renders the
   matching `*View` component with the same props — this is the entire
   dispatch mechanism; there is no conditional chain anywhere checking
   `type === 'bubble_sort'` etc. Unrecognized types render a graceful
   fallback instead of crashing, which matters because the backend can ship
   new challenge types ahead of a client update.

9. **Local prediction UI (render-only).** Inside the chosen `*View`, the
   user interacts with a purely client-rendered simulation of the
   algorithm (tap cells, choose swap/no-swap, type predicted stack/queue
   contents, etc.). Every local helper that "computes the correct answer"
   (`getStepPair`, `computeCorrectAnswer`, `computeCorrectMids`,
   `computeAllStates`/`computeQueueAllStates`) exists purely to drive
   animation and to show a "correct answer" hint after a wrong submission —
   none of it is what determines `isCorrect`. Each user action is both kept
   in local component state and pushed via `onActionCaptured` into
   `sessionStore.capturedActions` (used only for the small "N hành động đã
   ghi nhận" footer counter on `ChallengeScreen` — not sent to the backend
   itself; what *is* sent is each view's own locally-built `actions` array).

10. **Submission.** When the user taps Submit, the view calls
    `submissionsApi.submit(activeTaskId, actions)` → `POST /submissions`.
    The backend alone determines `isCorrect`, `points`, `attemptsUsed`,
    `maxAttempts`, and the full `attemptHistory` — the response is the only
    source of truth rendered in the result UI.

11. **Result handling (identical across all five challenge types).**
    On success: `setResult(res)` (local) and `sessionStore
    .setSubmissionResult(res)` (so the result persists if this exact
    `Challenge` screen instance re-renders), `setPhase('result')`,
    `cacheStore.incrementAttempts(taskId)` (updates `SubjectScreen`'s
    dots/lock state without a refetch), and — only if this was attempt #1
    and it was correct and worth > 0 points — `cacheStore.addPoints(points)`
    (keeps `HomeScreen`'s points pill in sync without a refetch, while not
    double-counting points on a retried-but-already-scored task). If
    correct, also re-fetches `badgesApi.get()` to catch a newly-awarded
    badge for the home screen's "latest badge" card. If
    `attemptsUsed < maxAttempts`, a "Try again" button resets the view back
    to the predicting phase (still under the same `activeTaskId`).

12. **Completion overlay.** Back on `HomeScreen`, `totalDone`/
    `totalAvailable` (derived from `cacheStore.todayTasks`) are recomputed on
    every render; once they're equal, `cacheStore
    .setAllTasksCompletedToday(true)` fires, and `App.tsx` — which is always
    mounted above `HomeScreen` — immediately renders `CompletionOverlay` over
    the entire app (confetti + tomorrow's topics + today's point total).
    Dismissing it just flips the flag back to `false`; it isn't persisted, so
    it will reappear if the condition is re-derived true again (e.g. screen
    remount) until the next calendar day's tasks replace `todayTasks`.

13. **Global 401 / logout flow** (can happen at any point above, not just at
    the end): every request made through the shared `api` Axios instance
    (every API call in the app goes through it) carries the bearer token via
    the request interceptor. If any response comes back `401` — token
    expired, revoked, or simply invalid — the response interceptor invokes
    the single registered `_onUnauthorized` callback, which is exactly
    `() => useAuthStore.getState().logout()`, wired once at module scope in
    `App.tsx` (not inside a component, to dodge a circular `api.ts` ↔
    `authStore.ts` import). `logout()` clears the on-disk token, resets
    `cacheStore`/`sessionStore`/`uiStore`, and clears `authStore` itself —
    which makes `App.tsx`'s `token` become `null`, which makes it render
    `AuthStack` instead of `MainNavigator`, landing the user back on
    `LoginScreen`. This is the *only* path that reacts to 401s by logging
    out; `parseApiError` (used for displaying the error text in whichever
    screen made the failing call) is a separate, side-effect-free formatter
    that just returns a "Session expired" message for display — it doesn't
    duplicate the logout logic.

14. **Crash safety net (orthogonal to all of the above).** If anything in the
    render tree throws an uncaught error at any point in this flow,
    `ErrorBoundary` (wrapping `NavigationContainer` + all overlays) catches
    it, logs it via `console.error`, and shows a "Restart" screen instead of
    a blank crash — independent of network/auth state entirely.
