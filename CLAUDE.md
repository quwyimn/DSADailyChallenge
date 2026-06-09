# CLAUDE.md — Project entrypoint

> **You are an AI coding assistant working on this project. Read this file first, every session.**
> It tells you what the project is and which file to read next for any task.

## What this project is

**DSA Daily Challenge** — a mobile app that helps users build a daily habit of studying Data Structures & Algorithms through small interactive 2D tasks (e.g. predict Bubble Sort steps, drag-and-drop a linked list). Users earn points, keep streaks, unlock badges, and compete on a weekly leaderboard. Admins author daily tasks, manage simulation content, and view per-class completion stats.

- **Solo fullstack developer. One month. Deadline: 26 Jun 2026, 18:00.**
- Two clients (user mobile + admin web), one REST API, one Postgres DB. Classic 3-tier.

## The six golden rules (never violate, in any file)

1. **Backend is the only source of truth** — it generates challenges, computes correct answers, validates, scores, computes streak/leaderboard. The client never knows the answer in advance.
2. **Never trust the frontend** — all validation and anti-cheat on the backend.
3. **Animation is render-only** — it never decides correct/incorrect.
4. **Stability over fancy** — NO 3D, NO realtime sockets, NO microservices, NO over-engineering.
5. **Store time in UTC**, convert to GMT+7 only when displaying or computing "today" for the daily reset.
6. **Challenge engine is data-driven** from the first challenge — no scattered `if (type === ...)` branches.

## Tech stack (fixed)

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo (test on real **iPhone / iOS**) |
| Backend | NestJS (Node + TypeScript) |
| DB | PostgreSQL on Google Cloud SQL |
| ORM | Prisma |
| Admin web | React + Vite |
| Mobile state | Zustand |
| Deploy | backend → Render, admin → Vercel, DB → Google Cloud SQL |

## Which file to read next

| If your task is about… | Read |
|---|---|
| Where code lives, folders, entrypoints, where to add a file | `MAP.md` |
| What you're allowed/forbidden to do; conventions; anti-over-engineering | `RULES.md` |
| Why the system is shaped this way; data flow; business logic; design reasoning | `ARCHITECTURE.md` |
| Past decisions, known bugs, technical debt, gotchas already discovered | `MEMORY.md` |
| How to implement a feature, test, deploy, validate, what "done" means | `WORKFLOW.md` |
| **You are about to change/add/remove/deviate anything** | Log it in `CHANGES.md` (mandatory, same change) |

## How to work here (most important behavior)

- Build **one vertical slice at a time**, end-to-end (mobile → API → DB → mobile). A login flow that runs for real beats 20 unconnected screens.
- Follow the build order in `WORKFLOW.md`. Do not jump ahead.
- When unsure about scope, **do less, ask the developer** — never invent features or add libraries not listed in the stack.
- Before editing architecture or adding a dependency, check `RULES.md` and `ARCHITECTURE.md` first.