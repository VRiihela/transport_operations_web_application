# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**FleetFlow** — a mobile-first work management and job logging system for a small transport company (6 workers, 3 vans, 2 trucks). Built as a greenfield product using an AI-assisted DevSecOps pipeline.

Stack: React + TypeScript frontend (not yet built), Node.js + TypeScript backend, PostgreSQL, REST API, JWT auth.

---

## Backend commands (`backend/`)

```bash
npm run dev           # run with tsx (no build step)
npm run build         # tsc compile to dist/
npm test              # vitest (watch mode)
npm test -- --run     # vitest (CI / single run)
npx tsc --noEmit      # type-check without emitting
npm audit --audit-level=high

# Prisma
DATABASE_URL=... npx prisma validate
npx prisma generate
npx prisma migrate dev --name <migration-name>
npm run migrate:deploy   # npx prisma migrate deploy (production)
npm run cleanup:tokens   # delete expired/revoked refresh tokens
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
npm run dev                                 # interactive mode (prompts for task details)
```

**Task specs** live in `agents/tasks/` as JSON files matching the `TaskSpec` interface (`orchestrator.ts`). See `agents/tasks/task-template.md` for the schema.

**Pipeline reports** are saved to `agents/orchestrator/reports/` and `agents/orchestrator/run_log.json`.

**Agent prompts** are loaded from `agents/core/0N_*.md` files at runtime. If a `.md` file is missing, built-in fallback prompts in `orchestrator.ts` are used. Edit the `.md` files to change agent behaviour without touching the orchestrator code.

The `ANTHROPIC_API_KEY` env var must be set before running the pipeline.

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

**Audit logging** (`AuditService`) writes every auth event to the `audit_logs` table. It never throws — failures are logged to stderr only, so audit issues never break the request flow.

**Rate limiting:** `loginRateLimit` (10 req / 15 min) and `refreshRateLimit` (30 req / 15 min) are applied at the route level. The key generator uses `X-Forwarded-For` with basic validation, falling back to `req.ip`. `app.set('trust proxy', 1)` is required.

**RBAC:** Three roles — `Admin`, `Dispatcher`, `Driver`. Use `requireRole(...roles)` after `authenticateToken`. Convenience exports: `adminOnly`, `adminOrDispatcher`, `blockDrivers`.

### Prisma schema (`backend/prisma/schema.prisma`)

Models: `User`, `RefreshToken` (with `lastUsedAt`, `revokedAt`, `@@index([userId])`), `AuditLog`. Enums: `UserRole`, `AuditEvent`.

---

## Conventions (from `agents/conventions.md`)

- TypeScript strict mode; avoid `any`; explicit return types on exported functions.
- Express: validate all external input server-side; use middleware for cross-cutting concerns; return consistent error shapes.
- Tests must cover failure paths and include negative cases.
- New dependencies require explicit justification; minimise the attack surface.

## Definition of Done (summary)

A task is done when: acceptance criteria met, no unnecessary `any`, tests include negative paths, server-side input validation in place, auth/authz enforced, no stack traces exposed to clients, no secrets committed, `npm audit` has no unresolved HIGH/CRITICAL.

---

## Environment variables

```
DATABASE_URL          PostgreSQL connection string
JWT_SECRET            Min 32 chars — signs access tokens
JWT_REFRESH_SECRET    Min 32 chars — signs refresh tokens
NODE_ENV              production | development
FRONTEND_URL          CORS origin (default: http://localhost:3000)
PORT                  Server port (default: 3001)
```

`validateEnvironment()` in `utils/env.ts` crashes the process on startup if any of the first three are missing or too short.

## Git

- Commit after each pipeline run is implemented and compiles clean
- Do not push to remote — developer pushes manually after reviewing
- `run_log.json` committed to git — audit trail of all pipeline runs
- `.env` never committed — `node_modules/`, `dist/`, `.env` in `.gitignore`