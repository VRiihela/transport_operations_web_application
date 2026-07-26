# Task Spec Authoring Guide

> How to write task specs that pass through the pipeline without blocks or crashes.
> Based on real FleetFlow pipeline runs — these rules fix actual failures.

---

## Quick rules

- **Max 6 acceptance criteria** — more causes Implementer context truncation
- **Split backend and frontend into separate tasks** — they truncate each other
- **Split inspect (read-only) and edit (write) into separate tasks**
- **Use camelCase field names** — `acceptanceCriteria`, not `acceptance_criteria` (orchestrator crashes with TypeError on snake_case)
- **Delete `_comment` before running** — it's metadata, not data
- **Order `affectedFiles` by importance** — the last file in the list is what gets truncated when the Implementer runs out of output budget (observed in 3 of 3 `scheduleType` runs)
- **Do not list test files in `affectedFiles`** — tests are always the truncation casualty. Give them their own `task-NN-tests.json`, or write them in Claude Code after the implementation lands

---

## Schema — required fields

```json
{
  "taskId": "kebab-case-unique-id",
  "title": "Human readable",
  "profile": "Node/TypeScript Backend | React/TypeScript Frontend | Node/TypeScript Full-Stack",
  "repo": "work_management_system",
  "tech": "Node.js, TypeScript, Express, PostgreSQL, Prisma 6, Zod, Vitest, React 18, Vite, CSS Modules, Axios",
  "keyConstraints": "...",
  "description": "...",
  "acceptanceCriteria": [],
  "affectedFiles": [],
  "implementationNotes": [],
  "securityConsiderations": "..."
}
```

Missing `taskId`, `profile`, `tech`, or `keyConstraints` → pipeline crash or wrong-stack output.

---

## keyConstraints — copy this for FleetFlow

```
TypeScript strict mode, Zod validation server-side, .nullish() not .optional().nullable(), Prisma selects must include all returned fields (jobInclude is source of truth), no UI component libraries, CSS Modules only
```

---

## acceptanceCriteria — how to write them

Each criterion must be independently testable.

**Backend:**
- Include: HTTP method, endpoint path, Zod-validated fields, response shape, status code
- Example: `POST /api/jobs returns { data: Job } with status 201; Zod rejects missing title with 400`

**Frontend:**
- Include: component name, user action, expected visual outcome
- Example: `JobEditModal pre-populates all fields from the job prop on open`

**Always include as last criterion:**
```
npx tsc --noEmit passes with no errors
```

---

## affectedFiles — be explicit

List every file the Implementer will need to touch. Missing files = agent guesses wrong paths.

Order matters: put the file that carries the feature first and the least important last. The tail of this list is what gets truncated.

**Backend feature pattern:**
```
backend/prisma/schema.prisma           (if schema change)
backend/src/routes/thing.routes.ts
backend/src/services/thing.service.ts
backend/src/types/thing.types.ts
backend/src/app.ts                     (if registering new router)
```

**Frontend feature pattern:**
```
frontend/src/pages/ThingPage.tsx
frontend/src/pages/ThingPage.module.css
frontend/src/api/axios.ts              (if new API calls)
```

---

## implementationNotes — prevent blocks

This is where you prevent the most common Reviewer blocks. Be specific.

**Always include for backend tasks:**
```
"Do not rewrite working code — only add what is missing.",
"Prisma: after schema change run npx prisma generate before starting server.",
"Zod: use z.nativeEnum() for enums, z.string().min(1) for FK fields (not z.string().cuid() — fails on some Prisma IDs).",
"Zod: use .nullish() not .optional().nullable().",
"Add PATCH and DELETE to CORS allowed methods in app.ts if not already present.",
"createdById must be taken from req.user.id (JWT), never from request body."
```

**Always include for frontend tasks:**
```
"Do not rewrite working code — only add what is missing.",
"CSS Modules only — no inline styles.",
"No localStorage or sessionStorage — tokens stay in React state only.",
"Use axiosInstance from api/axios.ts (not apiService) unless this is a DispatcherBoard component.",
"Datetime inputs: convert to .toISOString() before sending to API.",
"Status badge colors: DRAFT=gray, ASSIGNED=blue, IN_PROGRESS=yellow, COMPLETED=green.",
"Role badge colors: Admin=purple, Dispatcher=blue, Driver=green."
```

**For tasks that edit existing files:**
```
"Read the current contents of every file in affectedFiles before editing; produce real diffs, not templates or instructions."
```

**For Prisma schema changes:**
```
"jobInclude in job.service.ts is the source of truth for job response shape — add new fields there.",
"Every new field saved to DB must also appear in jobInclude or it returns null from all job endpoints."
```

> Caveat on the two notes above: they hold when `jobInclude` is typed `Prisma.JobSelect`. If it is typed `Prisma.JobInclude`, scalar fields are returned automatically and **must not** be added — `Prisma.JobInclude` only accepts relation fields and will fail `tsc`. Check the declared type before writing the note into a spec.

---

## Task splitting — when and how

| Situation | Split into |
|---|---|
| Backend + frontend in one task | task-01-backend.json + task-02-frontend.json |
| View + edit in one task | task-01-inspect-modal.json + task-02-edit-modal.json |
| Schema migration + feature | task-01-schema.json + task-02-feature.json |
| Feature + its tests | task-01-feature.json + task-02-tests.json |
| More than 6 acceptance criteria | Split by concern |

Name tasks so they run in order: `task-01-`, `task-02-`, etc.

---

## Run order across tasks

A later task's Architect reads the actual repo. Implement and commit task-01 **before** running task-02's pipeline, or the Architect will invent a field shape that does not match what landed.

```bash
# per task:
# 1. implement from the report in a fresh Claude Code session
cd backend && npx prisma generate && npx tsc --noEmit && npx vitest run
git add -A && git commit -m "feat(x): ... — pipeline run + manual patch"
mv agents/tasks/task-01-thing.json agents/tasks/done/
# 2. only now run the next spec
cd agents/orchestrator && npm run dev -- ../tasks/task-02-thing.json
```

---

## Handling pipeline blocks

**Do not re-run the full pipeline for small fixes.**

```bash
# Pattern for fixing a blocked run:
# 1. Find the report
ls agents/orchestrator/reports/

# 2. Tell Claude Code exactly what to fix
# Prompt: "Read agents/orchestrator/reports/run_<id>.md and implement
# everything in the IMPLEMENTER OUTPUT section. Do not rewrite anything else.
# Then fix: [specific issue from block reason]."
```

Common block causes and fixes:

| Block reason | Fix |
|---|---|
| `.optional().nullable()` | Replace with `.nullish()` |
| `z.string().cuid()` on FK field | Replace with `z.string().min(1)` |
| Field saves but returns null | Add field to `jobInclude` in `job.service.ts` |
| Missing Prisma import | Add `import { prisma } from '../lib/prisma'` |
| Sequelize / Joi / MongoDB patterns | Wrong-stack false positive — Claude Code fixes with correct Prisma/Zod pattern |
| CSS file truncated | Claude Code: write the missing CSS only, do not rewrite component |
| `useDrivers` hook missing | Claude Code: create the hook, do not touch other files |
| Scalar field added to `Prisma.JobInclude` | Not a bug to fix — remove the addition. `include` returns all scalars automatically; only `Prisma.JobSelect` needs the field listed. Do **not** convert queries from `include` to `select` |
| `as SomeEnum` cast on a Zod-parsed value | Root cause is a hand-written union instead of `z.nativeEnum(X)` from `@prisma/client`. Fix the enum source and the cast becomes unnecessary — deleting the cast alone surfaces a type error |
| `axios.isAxiosError is not a function` in tests only | `vi.mock('axios')` replaced the module. Mock `axiosInstance` from `api/axios.ts` instead, or spread `importOriginal()` so `isAxiosError` survives |
| Implementer emitted a template / `// ...` placeholder for an existing file | Output budget ran out. Claude Code writes the real diff; move that file earlier in `affectedFiles` next time |
| Test asserts against a mirror helper that recomputes the value | Tautological — set `process.env.TZ = 'UTC'` and assert literal strings |

**Before acting on any Reviewer or Security block:**
```bash
npx tsc --noEmit
```
If tsc passes clean, the block is a false positive. Fix only what tsc flags, not what the agent flagged.

---

## File naming and location

```
agents/tasks/task-01-thing-backend.json     ← ready to run
agents/tasks/task-02-thing-frontend.json
agents/tasks/done/task-01-thing-backend.json  ← move here after implementation
```

---

## Checklist before running a spec

- [ ] All field names are camelCase (`acceptanceCriteria`, not `acceptance_criteria`)
- [ ] `_comment` deleted
- [ ] `taskId` is unique and kebab-case
- [ ] `profile` matches the scope (Backend / Frontend / Full-Stack)
- [ ] Max 6 `acceptanceCriteria`
- [ ] Last criterion is `npx tsc --noEmit passes with no errors`
- [ ] `affectedFiles` lists every file to be touched, most important first
- [ ] No test files in `affectedFiles`
- [ ] `implementationNotes` includes stack-specific patterns for this task type
- [ ] Backend and frontend are in separate files if both are needed
- [ ] The previous task in the sequence is implemented and committed

---

## Run the pipeline

```bash
cd agents/orchestrator
npm run dev -- ../tasks/task-01-thing-backend.json
```

ANTHROPIC_API_KEY must be set:
```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
# or permanently:
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-...' >> ~/.zshrc
```