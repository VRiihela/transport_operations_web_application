# FleetFlow — Project Documentation

## Project Description

Work management system for a small transport company (6 workers, 3 vans, 2 trucks) currently managing jobs with Google Calendar. Replaces ad-hoc scheduling with a structured system for job assignment, status tracking, and completion reporting.

**Users:**
- **Admin** — manages users and has full system access
- **Dispatcher** — creates jobs, assigns drivers/teams, tracks status via board UI
- **Driver** — views and updates their own assigned jobs (direct or via team)

**Scope for v1:** Job/task management with role-based access, scheduling, structured addresses, completion reports with customer signature, driver teams. Fleet/vehicle model deferred to v2.

---

## Technology Choices

| Layer | Technology | Rationale |
|---|---|---|
| Backend runtime | Node.js + TypeScript | Strongest current stack, strict mode enforced |
| Backend framework | Express | Lightweight, well understood |
| Database | PostgreSQL | Relational, suits job/user/assignment model |
| ORM | Prisma 6 | Type-safe queries, migration support, Prisma Studio for dev |
| Validation | Zod | Runtime validation matches TypeScript types |
| Auth | JWT (access + refresh tokens) | Stateless, industry standard |
| Password hashing | bcrypt (cost 12) | OWASP recommended minimum |
| Testing | Vitest | Fast, TypeScript-native |
| Frontend | React 18 + Vite + TypeScript | Modern stack, fast dev server |
| Routing | React Router v6 | Standard for React SPAs |
| HTTP client | Axios | Interceptor support for token refresh |
| Styling | CSS Modules | No UI library — keeps bundle lean and full control |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable | Dispatcher board DnD |
| Date utilities | date-fns | Week navigation and date helpers in dispatcher board |
| API testing | Bruno | Local file-based, committable to git |

> **Note:** Prisma is pinned to v6. Prisma 7 introduced breaking changes (datasource url removed from schema.prisma; requires prisma.config.ts migration). Stay on v6 until migration is planned.

> **Note:** `npm run dev` in the backend uses `tsx src/server.ts` (no watch mode). The server **does not auto-reload** on file changes. Restart it manually after backend edits.

---

## Architecture

### Backend structure
```
backend/
  prisma/
    schema.prisma          — all models defined here
    migrations/            — migration history
  src/
    controllers/           — job.controller.ts, team.controller.ts
    routes/                — auth.routes.ts, job.routes.ts, team.routes.ts, user.routes.ts
    middleware/            — authenticate.ts, requireRole.ts, rateLimiter.ts
    services/              — auth.service.ts, audit.service.ts, job.service.ts,
                             user.service.ts, completion-report.service.ts
    jobs/                  — cleanupTokens.ts (scheduled script)
    utils/                 — jwt.ts, env.ts
    types/                 — auth.types.ts, audit.types.ts, job.types.ts,
                             team.types.ts, user.types.ts, completion-report.types.ts
    app.ts                 — Express app, route registration, CORS
    server.ts              — entry point, validateEnvironment()
```

### Frontend structure
```
frontend/
  src/
    api/                   — axios.ts (configured Axios instance + 401 interceptor)
    services/              — api.ts (ApiService class with token management, used by dispatcher board)
    contexts/              — AuthContext.tsx
    hooks/                 — useDrivers.ts
    components/            — ProtectedRoute.tsx, RoleRoute.tsx, JobDetailModal.tsx,
                             JobEditModal.tsx, CompletionModal.tsx, SignatureCanvas.tsx
    pages/
      LoginPage.tsx
      JobsPage.tsx          — dispatcher/admin job list + inline edit modal
      MyJobsPage.tsx        — driver job list with date picker
      UsersPage.tsx         — admin user management
      DispatcherBoard/
        DispatcherBoard.tsx                        — assign view + schedule view
        types.ts                                   — Job, Driver, Team, TeamMember interfaces
        teamsApi.ts                                — teams CRUD API client
        hooks/
          useTeams.ts                              — teams state, date-parameterised
        components/
          JobPool/JobPool.tsx                      — unassigned job pool (droppable)
          JobCard/JobCard.tsx                      — draggable job card
          JobCard/SortableJobCard.tsx              — sortable variant for driver columns
          DriverColumn/DriverColumn.tsx            — driver lane with sortable jobs
          TeamColumn/TeamColumn.tsx                — team lane (droppable, delete confirm)
          TeamManagementModal/TeamManagementModal.tsx — create team form
```

### Two Axios patterns (important)

There are two distinct Axios instances in the frontend:
- `api/axios.ts` — bare configured instance (`axiosInstance`), used in `JobsPage`, `MyJobsPage`, `UsersPage`
- `services/api.ts` — `ApiService` class singleton (`apiService.axios`), includes the 401→refresh→retry interceptor, used in `DispatcherBoard`

Both use `VITE_API_URL` as baseURL and `withCredentials: true`.

### Key design decisions

**Auth:**
- Access token: 15 min expiry, stored in React state only (never localStorage)
- Refresh token: 7 days expiry, stored in httpOnly cookie, hashed (SHA-256) in DB
- Token reuse detection: presenting a revoked refresh token revokes entire token family
- Deactivated users blocked at `AuthService.login()` — not just at route level

**RBAC:**
- `authenticateToken` middleware — verifies JWT, attaches user to req
- `requireRole(...roles)` middleware — checks req.user.role, returns 403 if not allowed
- Driver job visibility enforced at Prisma query level via OR clause:
  `where: { OR: [{ assignedDriverId: userId }, { teamId: { in: driverTeamIds } }] }`

**Job status transitions (validated server-side):**
```
DRAFT → ASSIGNED → IN_PROGRESS → COMPLETED
ASSIGNED → DRAFT (unassign)
```
Drivers can only transition: `ASSIGNED → IN_PROGRESS → COMPLETED`  
Drivers use a separate endpoint: `PATCH /api/jobs/:id/status`  
Completing a job requires an approved `CompletionReport` first.

**Teams:**
- A `Team` is date-specific — created for a particular work date
- A driver can be a member of multiple teams (one per date in practice)
- When a job is assigned to a team, `assignedDriverId` is set to null
- Team jobs are visible to all team members in their My Jobs view
- Dispatcher board shows driver columns and team columns side-by-side for the selected date
- Team membership drives the Prisma OR query for driver job visibility

**Soft delete:**
- Jobs have `deletedAt` field — never hard deleted
- All list and get queries filter `deletedAt: null`

**Security:**
- CORS allows: GET, POST, PATCH, DELETE, OPTIONS
- `withCredentials: true` on all Axios instances (required for httpOnly cookie)
- Axios 401 interceptor: silent token refresh → retry original request → logout if refresh fails
- Passwords never returned in any API response — Prisma selects explicit safe fields only
- `createdById` always set from JWT, never from request body

**Prisma selects — critical pattern:**
Saving a field to the DB is not sufficient. Fields must also appear in the Prisma `include`/`select` object in every route that returns that resource, or they will be missing from API responses. The `jobInclude` constant in `job.service.ts` is the single source of truth for what a job response includes.

---

## Data Model

### Job fields
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| title | String(255) | Required |
| description | String? | Optional |
| status | JobStatus | DRAFT / ASSIGNED / IN_PROGRESS / COMPLETED |
| assignedDriverId | String? | FK → User; null when assigned to team |
| teamId | String? | FK → Team; null when assigned directly to driver |
| sortOrder | Int | Used for ordering within driver columns on dispatcher board |
| scheduledStart | DateTime? | |
| scheduledEnd | DateTime? | |
| schedulingNote | String? | Required when both scheduled times are null |
| driverNotes | String? | Set by driver only |
| street/houseNumber/stair/postalCode/city | String? | Pickup address |
| deliveryStreet/…/deliveryCity | String? | Delivery address (optional) |
| location | String? | Legacy free-text field |
| notes | String? | Dispatcher notes |
| createdById | String | FK → User |
| deletedAt | DateTime? | Soft delete |

**Invariant:** `assignedDriverId` and `teamId` are mutually exclusive. A job cannot have both set.

### Team fields
| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| name | String(100) | Display name |
| date | DateTime | The work date this team is for (stored as UTC midnight) |
| createdById | String | FK → User |

TeamMember: `@@unique([teamId, userId])` — one membership record per driver per team.

---

## API Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/login | — | Returns access token + sets refresh cookie |
| POST | /api/auth/refresh | — | Rotates refresh token |
| POST | /api/auth/logout | Bearer | Revokes token |
| GET | /api/users | Admin | List users |
| POST | /api/users | Admin | Create user |
| PATCH | /api/users/:id | Admin | Update user |
| GET | /api/jobs | Admin/Dispatcher/Driver | List jobs; Driver filtered by assignedDriverId OR team membership |
| GET | /api/jobs/my-jobs | Driver | All direct + team-assigned jobs (no date filter) |
| POST | /api/jobs | Admin/Dispatcher | Create job |
| GET | /api/jobs/:id | All | Get single job |
| PATCH | /api/jobs/:id | Admin/Dispatcher | Update job (title, schedule, driver, team, etc.) |
| DELETE | /api/jobs/:id | Admin | Soft delete |
| PATCH | /api/jobs/:id/status | Driver | Status transition only |
| PATCH | /api/jobs/:id/notes | Driver | Update driverNotes |
| POST | /api/jobs/:id/completion-report | Any | Upsert completion report |
| POST | /api/jobs/:id/completion-report/approve | Any | Approve completion report |
| GET | /api/teams?date=YYYY-MM-DD | Admin/Dispatcher | Teams for a specific date |
| POST | /api/teams | Admin/Dispatcher | Create team |
| PATCH | /api/teams/:id | Admin/Dispatcher | Update team name/members |
| DELETE | /api/teams/:id | Admin/Dispatcher | Delete team (blocks if active jobs assigned) |

---

## Implemented Features

| Feature | Status | Notes |
|---|---|---|
| JWT auth (login, refresh, logout) | ✅ Done | httpOnly refresh token cookie |
| RBAC middleware | ✅ Done | Admin / Dispatcher / Driver |
| Rate limiting | ✅ Done | Login + refresh endpoints |
| Audit logging | ✅ Done | Never throws — failures log to stderr |
| Refresh token cleanup job | ✅ Done | cleanupTokens.ts |
| Job CRUD + status transitions | ✅ Done | Server-side validated transitions |
| Driver status endpoint | ✅ Done | PATCH /api/jobs/:id/status |
| Driver notes | ✅ Done | PATCH /api/jobs/:id/notes |
| Dispatcher jobs list (JobsPage) | ✅ Done | Admin + Dispatcher |
| Dispatcher job edit modal | ✅ Done | Includes driver/team picker |
| Dispatcher board — assign view | ✅ Done | Driver columns + team columns, drag-to-assign |
| Dispatcher board — schedule view | ✅ Done | Weekly grid, drag-to-schedule |
| Route ordering within driver columns | ✅ Done | @dnd-kit/sortable, persisted via sortOrder |
| Driver teams backend | ✅ Done | Team/TeamMember models, CRUD routes |
| Team management UI | ✅ Done | TeamManagementModal, TeamColumn |
| Team job visibility for drivers | ✅ Done | OR query in getJobs and getMyJobs |
| GET /api/jobs/my-jobs | ✅ Done | Driver-only, no date filter |
| Driver my jobs view | ✅ Done | Date picker, shows direct + team jobs |
| Team badge on job cards | ✅ Done | Shown in MyJobsPage and dispatcher board |
| User management (Admin CRUD) | ✅ Done | |
| Scheduling fields on jobs | ✅ Done | scheduledStart, scheduledEnd, schedulingNote |
| Finnish datetime formatting | ✅ Done | Same-day collapsing |
| Structured address fields | ✅ Done | Pickup + optional delivery |
| Job completion report | ✅ Done | Customer signature via HTML5 canvas |
| Job detail modal | ✅ Done | Read-only, all fields |
| UI polish | 🔄 In progress | |
| README | ⬜ Todo | |
| Deploy (Railway + Vercel) | ⬜ Todo | |
| Fleet/vehicle model | ⬜ Backlog | v2 |

---

## Conventions

**TypeScript:**
- Strict mode enforced — no `any` types
- Interfaces for all API request/response shapes
- Enums for role (`Admin`, `Dispatcher`, `Driver`) and job status

**API responses:**
- Success: `{ data: ... }`
- Error: `{ error: string }`
- Validation errors: 400, auth errors: 401, permission errors: 403, not found: 404, conflict: 409

**Validation:**
- All request bodies validated with Zod before reaching route handlers
- `.nullish()` preferred over `.optional().nullable()` — the latter is redundant
- Server-side only — frontend validation is UX only, never trusted
- Use `z.string().min(1)` instead of `z.string().cuid()` for FK inputs — `cuid()` fails for some ID formats in Zod v4

**Database:**
- All queries through Prisma — no raw SQL
- Soft delete pattern for jobs (`deletedAt`)
- Soft deactivate for users (`isActive: false`)

**Frontend:**
- No inline styles — CSS Modules only
- No UI component library
- No token or user data in localStorage or sessionStorage
- Status badge colors: DRAFT=gray, ASSIGNED=blue, IN_PROGRESS=yellow, COMPLETED=green
- Role badge colors: Admin=purple, Dispatcher=blue, Driver=green

**Git:**
- One feature per commit
- Commit after each pipeline run is implemented and compiles clean
- `run_log.json` committed to git — audit trail of all pipeline runs
- `.env` never committed — `node_modules/`, `dist/`, `.env` in `.gitignore`

**Agentic workflow:**
- Task specs live in `agents/tasks/` as JSON files
- Max ~6 acceptance criteria per task spec — split if larger
- Pipeline run → Claude Code implements report → `npx tsc --noEmit` → commit
- Small targeted fixes go directly to Claude Code — no pipeline re-run needed
- Cannot resume a blocked pipeline mid-run; fix the code directly then continue to the next task
- Tasks moved to `agents/tasks/done/` after implementation

---

## Environment Variables

```
DATABASE_URL          PostgreSQL connection string
JWT_SECRET            Min 32 chars — signs access tokens
JWT_REFRESH_SECRET    Min 32 chars — signs refresh tokens
NODE_ENV              production | development
FRONTEND_URL          CORS origin (default: http://localhost:3000)
PORT                  Server port (default: 3001)
VITE_API_URL          Backend URL for frontend (e.g. http://localhost:3001)
```

`validateEnvironment()` in `utils/env.ts` crashes the process on startup if DATABASE_URL, JWT_SECRET, or JWT_REFRESH_SECRET are missing or too short.

---

## Deployment Plan

| Service | Target | Notes |
|---|---|---|
| Backend | Railway | Set env vars in Railway dashboard |
| Frontend | Vercel | Set `VITE_API_URL` to Railway backend URL |
| Database | Railway PostgreSQL | Run `npx prisma migrate deploy` on first deploy |

CORS `FRONTEND_URL` must be updated to the Vercel production URL before deploy.

---

## Known Issues / Gotchas

- **Prisma version:** Pinned to v6. Do not upgrade to v7 without planning the `prisma.config.ts` migration.
- **Prisma client sync:** After any schema change, run `npx prisma generate` before starting the server.
- **Prisma selects:** Every field saved to DB must also appear in the route's `include`/`select` object or it will be missing from responses. The `jobInclude` constant in `job.service.ts` is authoritative.
- **No backend hot reload:** `npm run dev` uses `tsx` without watch mode. Restart the backend manually after editing any `.ts` file.
- **CORS:** Must include PATCH and DELETE — easy to miss, breaks status update and delete endpoints.
- **Datetime inputs:** Browser datetime-local inputs need `.toISOString()` conversion before sending to API.
- **Team date storage:** Teams store `date` as UTC midnight from `new Date("YYYY-MM-DD")`. Driver date-range queries use local midnight. This works correctly for Helsinki (UTC+2/+3) because the UTC midnight falls within the local day bounds.
- **Zod v4 cuid():** `z.string().cuid()` sometimes rejects valid Prisma-generated IDs. Use `z.string().min(1)` for FK fields — DB foreign key constraint provides the validity guarantee.
- **Zod v4 datetime():** Rejects `YYYY-MM-DD` date-only strings. Use `z.string().min(1)` for date-only fields.
- **DnD dual-hook conflict:** Never call both `useDraggable` and `useSortable` on the same element ID. `useSortable` internally calls `useDraggable`; the second registration overwrites the first. Use separate `JobCard` (draggable only) and `SortableJobCard` (sortable only) components.
- **Admin seed:** No automated seed for initial admin account — needs a reliable solution before deploy.

---

## Open Questions

- Fleet/vehicle model — add before or after deploy?
- User self-service — should drivers be able to update their own profile/password?
- Mobile — driver view on phone is more realistic; worth a responsive pass before deploy?
- Notifications — out of scope for v1 or worth a simple in-app notification?
- Local LLM integration — Ollama as runtime for routine pipeline tasks, larger model as orchestrator/security reviewer?
