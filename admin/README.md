# DSA Daily Challenge — Admin Panel

A React + Vite single-page web app for managing the content behind **DSA
Daily Challenge**: admins author challenge tasks, manage classes, assign
tasks to specific dates, and review per-class completion stats. It talks to
the same NestJS backend the mobile app uses, authenticating as a user whose
role is `admin`.

There is no client-side router — the whole app is one page (`/`) with an
in-memory sidebar tab switch (Tasks / Classes / Assignments / Stats) gated
behind a login screen.

## Tech stack

- React 19 + TypeScript, built with Vite
- Axios for the API client
- Recharts for the completion-rate bar chart on the Stats page
- No UI framework, no router, no state-management library — plain `useState`
  and inline `style` objects throughout

## Install and run locally

```bash
cd admin
npm install
npm run dev
```

This starts the Vite dev server (default `http://localhost:5173`) with HMR.
You'll need the backend API running and reachable at whatever URL you set in
`VITE_API_URL` (see below), and you'll need an existing user account with
`role: 'admin'` in that backend to log in.

## Environment variables

The app reads a single env var, bundled at build time by Vite:

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend REST API | `http://localhost:3000/api` |

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` to point at your local backend:
   ```
   VITE_API_URL=http://localhost:3000/api
   ```

If `VITE_API_URL` is unset, `src/services/api.ts` falls back to
`http://localhost:3000/api`.

For production builds, set `VITE_API_URL` to your deployed backend's HTTPS
URL (see `.env.production` for the placeholder format used with the
Render-hosted backend). **Do not commit the real production value** —
`.gitignore` excludes `.env*` (except `.env.example`) for this reason.

## Build for production

```bash
npm run build
```

This runs `tsc -b` (a project-references type-check across
`tsconfig.app.json` / `tsconfig.node.json`, emitting nothing) followed by
`vite build`, producing a static bundle in `dist/`. Preview the production
build locally with:

```bash
npm run preview
```

## Vercel deploy

This is a standard static Vite SPA, so Vercel's auto-detected Vite preset
works with no `vercel.json`:

- **Build command:** `npm run build` (Vercel runs this automatically once it
  detects the Vite framework)
- **Output directory:** `dist`
- **Environment variable:** set `VITE_API_URL` in the Vercel project's
  Settings → Environment Variables to your deployed backend's HTTPS URL
  (e.g. `https://your-render-backend.onrender.com/api`) — it must be set
  there for both Production and Preview environments, since Vite only reads
  `VITE_*` vars at build time, not at runtime.
- No rewrite/redirect rules are needed: since there's no client-side router,
  there are no deep-linkable sub-routes that would 404 on refresh.

## Pages

| Page | File | Description |
|---|---|---|
| Login | `src/pages/Login.tsx` | Email/password sign-in gate; rejects non-admin accounts client-side after a successful login response. |
| Tasks | `src/pages/Tasks.tsx` | "Challenge Bank" — list, create, edit, and delete challenge tasks (type, title, description, JSON config). |
| Classes | `src/pages/Classes.tsx` | List, create, edit, and delete classes (name + grade). |
| Assignments | `src/pages/Assignments.tsx` | Pick a date, see which tasks are assigned to it (auto-generating a default set if none exist yet), assign more, or remove one. |
| Stats | `src/pages/Stats.tsx` | Per-class weekly completion-rate bar chart plus a detail table (students, completion rate, submissions, points). |

See `LOGIC.md` for a full technical breakdown of every file and the
end-to-end admin workflow.
