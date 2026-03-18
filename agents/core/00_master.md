# 00 – Master Prompt (Agentic DevSecOps Task Run)

You are operating in an AI-assisted DevSecOps workflow.
Goal: deliver production-quality changes with lightweight Secure SDLC thinking.

## Project Profile

Selected profile:
- React Frontend
- Node/TypeScript Backend
- Custom: Mobile-first transport operations web application

Apply the profile rules on top of core agent rules.
All stages must follow selected profile rules (tooling, tests, audit).

## Project context
- Repo: FleetFlow Work Management System
- Tech: React + TypeScript frontend, Node.js + TypeScript backend, PostgreSQL, REST API
- Key constraints: TypeScript strict mode, mobile-first UI, responsive design, secure auth, audit trail, easy job logging from phone or desktop
- Conventions: keep components modular, validate all inputs server-side, prefer explicit typing, keep business logic out of UI components
- Definition of Done: feature works on desktop and mobile, tests pass, no critical lint/type errors, role-based access enforced, audit/security review completed

## Task
Build a work management and job logging system for a small transport company with:
- 6 workers
- 3 vans
- 2 trucks

The software must allow users to create, assign, update, and complete transport jobs easily from both desktop and mobile devices.

Main business need:
- Jobs must be quick to enter and easy to update in the field.
- The system should support dispatching, work logging, status tracking, and basic reporting.
- It must fit a small company, not an enterprise.

Core functional scope:
1. User authentication and role-based access
   - Admin
   - Dispatcher
   - Driver

2. Job management
   - Create new job
   - Edit job details
   - Assign worker and vehicle
   - Set date/time
   - Add pickup and delivery locations
   - Add customer details
   - Add notes, cargo details, and special instructions
   - Track job status: Draft / Planned / Assigned / In Progress / Completed / Cancelled

3. Mobile-first work logging
   - Drivers can open assigned jobs on phone
   - Start job
   - Update progress
   - Record mileage/hours
   - Add notes/photos/signature if implemented
   - Mark completed

4. Fleet and worker visibility
   - Vehicles list: 3 vans, 2 trucks
   - Workers list: 6 employees
   - See current assignments and availability status

5. Reporting and history
   - View completed jobs
   - Filter by driver, vehicle, customer, date, status
   - Export job records for invoicing/accounting later

6. Non-functional requirements
   - Very fast data entry
   - Clear UI for non-technical users
   - Works well on mobile browsers
   - Secure handling of user data and operational data
   - Maintainable codebase for future expansion

## Acceptance criteria
- Users can sign in securely and only access allowed features by role.
- Dispatcher/Admin can create and assign a job in under 2 minutes using desktop or mobile.
- Driver can open assigned jobs, update status, and submit job logs from a phone.
- Job list supports filtering by status, driver, vehicle, and date.
- System records audit-relevant events for job creation, assignment, and completion.
- Frontend is responsive and usable on small screens.
- Backend validates all incoming data.
- Unit/integration tests cover critical flows.
- No sensitive secrets are exposed to the client.

## Inputs (provide if available)
- Relevant file paths
  - frontend/src/pages/JobsPage.tsx
  - frontend/src/pages/JobDetailPage.tsx
  - frontend/src/components/JobForm.tsx
  - frontend/src/components/JobStatusCard.tsx
  - frontend/src/components/MobileJobActions.tsx
  - frontend/src/pages/LoginPage.tsx
  - backend/src/routes/jobs.ts
  - backend/src/routes/auth.ts
  - backend/src/routes/vehicles.ts
  - backend/src/routes/users.ts
  - backend/src/services/jobService.ts
  - backend/src/middleware/auth.ts
  - backend/src/middleware/authorize.ts
  - backend/src/db/schema.ts
- Current code snippets
  - Not provided yet
- Existing tests
  - Add tests for auth, job CRUD, assignment flow, and status transitions
- API contracts / schemas
  - Jobs, users, vehicles, work logs, status history
- Security concerns (if known)
  - Unauthorized data access between drivers
  - Insecure direct object references
  - Weak validation in mobile forms
  - Sensitive operational/customer data leakage

## Workflow stages (run in order)
1) ARCHITECT → plan + file list + risks + CIA impact + dependency decision
2) IMPLEMENTER → code changes (file-by-file)
3) REVIEWER → code review notes + improvements
4) TESTER → tests + edge cases
5) SECURITY → OWASP-lite + dependency/supply-chain review + mitigations
6) RELEASE → DoD checklist + how to verify

## Output format rules
- Use headings: [ARCHITECT OUTPUT], [IMPLEMENTER OUTPUT], etc.
- Be concrete: propose exact files and changes.
- If adding dependencies: justify + note audit requirement.
- Never trust external input; validate server-side.
- Optimize every decision for a real small transport company workflow, not a generic SaaS demo.
- Prefer simple, extensible domain models over enterprise-level complexity.
- When designing UI, prioritize one-hand mobile use, large touch targets, and fast status updates.
