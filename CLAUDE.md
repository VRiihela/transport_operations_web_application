# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

**Do not push to remote. The developer pushes manually after review.**

---

## Project

**FleetFlow** — a job and fleet management system for a small transport company (6 workers, 3 vans, 2 trucks) currently using Google Calendar. Built as a greenfield product using an AI-assisted DevSecOps pipeline (agentic-devsecops-kit).

Stack: React 18 + TypeScript + Vite frontend, Node.js + TypeScript + Express backend, PostgreSQL, Prisma 6, JWT auth.

---

## Backend commands (`backend/`)

```bash
npm run dev           # run with tsx (no build step)
npm run build         # tsc compile to dist/
npm test              # vitest (watch mode)
npm test -- --run     # vitest (CI / single run)
npx tsc --noEmit      # type-check without emitting

# Prisma (pinned to v6 — do not upgrade to v7)
npx prisma generate                          # regenerate client after schema changes
npx prisma migrate dev --name <name>         # create and apply migration
npx prisma migrate deploy                    # apply migrations (production)
npx prisma studio                            # visual DB browser at localhost:5555
npx prisma validate                          # validate schema without migrating

npm audit --audit-level=high
npm run cleanup:tokens                       # delete expired/revoked refresh tokens
```

Run a single test file:
```bash
npx vitest run src/__tests__/auth.service.test.ts
```

---

## Agentic pipeline (`agents/orchestrator/`)

New features are developed by running task specs through a 6-stage AI pipeline: Architect → Implementer → Reviewer → Tester → Security → Release. Each stage can PASS or BLOCK.

```bash
cd agents/orchestrator
npm run dev -- ../tasks/<task-file>.json   # run a task spec through the pipeline
npm run dev                                 # interactive mode
```

**Task specs** live in `agents/tasks/` as JSON files. See `agents/tasks/task-template.md` for the schema. Max ~6 acceptance criteria per spec — split larger tasks.

**Pipeline reports** are saved to `agents/orchestrator/reports/` and `run_log.json`.

**Agent prompts** are loaded from `agents/core/0N_*.md` files at runtime. Edit `.md` files to change agent behaviour without touching the orchestrator.

The `ANTHROPIC_API_KEY` env var must be set before running the pipeline.

**If a pipeline run is blocked:** Fix the code directly in Claude Code using the report path and specific instructions. Do not re-run the full pipeline for small fixes.

---

## Architecture

### Backend (`backend/src/`)

```
server.ts          → entry point; calls validateEnvironment() before importing app
app.ts             → Express setup (trust proxy, json, cookie-parser, cors, routes)
routes/            → thin route handlers; validate with Zod, delegate to services
services/          → business logic (AuthService, AuditService)
middleware/        → authenticate.ts (JWT verify), requireRole.ts (RBAC), rateLimiter.ts
jobs/              → standalone scripts (cleanupTokens.ts)
utils/             → jwt.ts (sign/verify/hash), env.ts (startup validation)
types/             → auth.types.ts, audit.types.ts
```

**Auth flow:** `POST /api/auth/login` → validates credentials → returns access token (JWT, 15 min) in body + refresh token in httpOnly cookie. `POST /api/auth/refresh` rotates refresh token. `POST /api/auth/logout` requires `authenticateToken` middleware.

**Refresh tokens** are stored hashed (SHA-256) in PostgreSQL. Reuse detection revokes the entire token family for the user.

**Audit logging** (`AuditService`) writes every auth event to the `audit_logs` table. It never throws — failures are logged to stderr only.

**Rate limiting:** `loginRateLimit` (10 req / 15 min) and `refreshRateLimit` (30 req / 15 min) applied at route level. `app.set('trust proxy', 1)` is required.

**RBAC:** Three roles — `Admin`, `Dispatcher`, `Driver`. Use `requireRole(...roles)` after `authenticateToken`. Convenience exports: `adminOnly`, `adminOrDispatcher`, `blockDrivers`.

**Job status transitions (server-side validated):**
```
DRAFT → ASSIGNED → IN_PROGRESS → COMPLETED
ASSIGNED → DRAFT (unassign)
```
Drivers use a separate endpoint `PATCH /api/jobs/:id/status` and can only transition: `ASSIGNED → IN_PROGRESS → COMPLETED`.

### Prisma schema (`backend/prisma/schema.prisma`)

Models: `User`, `Job` (with scheduling fields, structured address fields, completion report), `RefreshToken` (with `lastUsedAt`, `revokedAt`, `@@index([userId])`), `AuditLog`. Enums: `UserRole`, `JobStatus`, `AuditEvent`.

**Critical pattern:** Every field saved to DB must also appear in the Prisma `select` object in every route that returns that resource — otherwise it returns `null`. This applies to scheduling fields, address fields, completion report fields, and any future additions.

---

## Implemented Features

- JWT auth with httpOnly refresh token cookies and token reuse detection
- RBAC (Admin / Dispatcher / Driver) enforced at middleware and query level
- Job CRUD with server-side validated status transitions
- Scheduling fields: `scheduledStart`, `scheduledEnd`, `schedulingNote`
- Finnish datetime formatting: `"23.03.2026 klo 19.05 – 20.06"` with same-day time range collapsing
- Structured address fields: pickup address (street, city, postalCode, country) + optional delivery address
- Dispatcher job edit modal (Admin + Dispatcher roles)
- Job completion report with customer signature capture (HTML5 canvas)
- Driver my-jobs view
- User management (Admin CRUD)
- Rate limiting and audit logging
- Refresh token cleanup job

---

## Conventions

**TypeScript:**
- Strict mode enforced — no `any` types
- Explicit return types on exported functions
- Interfaces for all API request/response shapes
- Enums for `UserRole` and `JobStatus`

**Zod:**
- Use `.nullish()` — not `.optional().nullable()` (redundant, reviewer block trigger)

**API responses:**
- Success: `{ data: ... }`
- Error: `{ error: string }`
- HTTP codes: 400 validation, 401 auth, 403 permission, 404 not found, 409 conflict

**Frontend:**
- No inline styles — CSS Modules only
- No UI component library
- No token or user data in localStorage or sessionStorage
- Status badge colors: DRAFT=gray, ASSIGNED=blue, IN_PROGRESS=yellow, COMPLETED=green
- Role badge colors: ADMIN=purple, DISPATCHER=blue, DRIVER=green

**Git:**
- One feature per commit
- Commit after pipeline run is implemented and `npx tsc --noEmit` passes
- `run_log.json` committed to git — intentional portfolio audit trail
- `.env` never committed

---

## Environment Variables

```
DATABASE_URL          PostgreSQL connection string
JWT_SECRET            Min 32 chars — signs access tokens
JWT_REFRESH_SECRET    Min 32 chars — signs refresh tokens
NODE_ENV              production | development
FRONTEND_URL          CORS origin (default: http://localhost:3000)
PORT                  Server port (default: 3001)
```

`validateEnvironment()` in `utils/env.ts` crashes the process on startup if any of the first three are missing or too short.

---

## Deployment

| Service | Target |
|---|---|
| Backend | Railway — set env vars in Railway dashboard |
| Frontend | Vercel — set `VITE_API_URL` to Railway backend URL |
| Database | Railway PostgreSQL — run `npx prisma migrate deploy` on first deploy |

Update `FRONTEND_URL` in backend env to the Vercel production URL before deploy.
