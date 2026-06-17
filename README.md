# DSA Daily Challenge

**DSA Daily Challenge** is a mobile app that helps students build a daily
habit of studying Data Structures & Algorithms through small, interactive
2D tasks — predicting Bubble Sort swaps, dragging and dropping linked list
nodes, tapping through a Binary Search, and more. Users earn points,
maintain streaks, unlock badges, and compete on a weekly leaderboard.

A companion admin web panel lets instructors author challenge content,
schedule which tasks go live on which day, manage classes, and review
per-class completion stats.

## Architecture

A classic 3-tier setup: both clients talk to one backend, which is the only
system that knows correct answers, scores, streaks, and rankings.

```
Mobile App (iOS, Expo)  ─┐
                         ├──►  NestJS REST API  ──►  PostgreSQL
Admin Panel (Web)       ─┘
```

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo |
| Backend | NestJS + Prisma + TypeScript |
| Database | PostgreSQL on Supabase |
| Admin | React + Vite |
| Deployed on | Render + Vercel |

## Key features

- **Daily challenge reset (GMT+7)** — a fresh set of tasks unlocks every day, with "today" computed in GMT+7 regardless of where data is stored.
- **Streak system** — tracks consecutive days a user has attempted every assigned task.
- **Badge system** — awarded automatically based on streak length and submission milestones.
- **Weekly leaderboard** — Monday–Sunday (GMT+7) points ranking, scored best-of-3-attempts per task.
- **Admin task management** — full CRUD over the challenge bank, classes, and which tasks are scheduled on which date.
- **Per-class completion stats** — admins can see completion rates and points totals broken down by class.

## Project structure

```
.
├── backend/   NestJS REST API — the single source of truth for content, grading, streaks, and the leaderboard
├── mobile/    React Native + Expo iOS app — where students complete daily challenges
└── admin/     React + Vite web panel — where instructors manage tasks, classes, and view stats
```

## Getting started

Each subfolder is independently runnable and has its own setup guide:

- [`backend/README.md`](backend/README.md) — install, environment variables, database migrations, running locally and in production, API reference.
- [`mobile/README.md`](mobile/README.md) — install, environment variables, running on a real iOS device via Expo Go, screen overview.
- [`admin/README.md`](admin/README.md) — install, environment variables, running locally, building for production, deploying to Vercel.

## Environment setup

Each subfolder (`backend/`, `mobile/`, `admin/`) has its own `.env` file and
a full set of setup instructions in its own README — there is no shared
root-level configuration. Start a service by following its subfolder's
README; you'll generally want the backend running first, since both the
mobile app and the admin panel depend on it.
