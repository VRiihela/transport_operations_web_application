# Project Context Template

Fill this file when integrating the framework into a project.

## Project Name
FleetFlow Work Management System

## Architecture Overview
- Backend: Node.js + TypeScript REST API (Express or Fastify)
- Frontend: React + TypeScript responsive web app optimized for mobile-first usage
- Database: PostgreSQL for relational data and reporting
- Auth mechanism: Email/password with JWT access tokens + refresh tokens, role-based access control

## Security-Sensitive Areas
- Authentication:
  - Secure login for dispatcher/admin/drivers
  - Password hashing with Argon2 or bcrypt
  - Session and token expiration handling
  - Password reset and account recovery flows
- Authorization:
  - Role-based access control for Admin, Dispatcher, Driver
  - Drivers can only view and update their own assigned jobs
  - Dispatchers can create, assign, edit, and close jobs
  - Admin can manage users, vehicles, reports, and settings
- External APIs:
  - Optional map/geocoding API for addresses and route assistance
  - Optional SMS/email notification provider for job updates
  - Optional accounting/export integrations
- Data processing:
  - Job creation, scheduling, assignment, status tracking
  - Work logs, mileage, cargo notes, delivery confirmations
  - Attachments/photos/signatures
  - Audit trail for job changes and status updates

## CI / Tooling
- Test runner: Vitest for unit/integration tests, Playwright for end-to-end tests
- Lint: ESLint
- Typecheck: TypeScript strict mode
- Dependency audit: npm audit (or pnpm audit) + Dependabot/Renovate

## Known Constraints
- Performance limits:
  - Small company scale: approximately 6 workers, 5 vehicles, low to moderate concurrent users
  - Mobile network conditions may be unstable; app should work well on slow connections
- Legacy code:
  - Assume greenfield project unless existing codebase is provided later
- Deployment environment:
  - Cloud-hosted web app, accessible from desktop and mobile browsers
  - HTTPS required
  - Backups required for operational data

## Notes for AI Agents
- Critical design decisions:
  - Mobile-first UX is mandatory because drivers and field workers will use phones
  - Fast job entry and status updates are more important than large ERP-style feature sets
  - Use simple workflows: create job → assign vehicle/driver → start work → complete work → export/report
  - Keep architecture modular so invoicing, GPS, and route optimization can be added later
  - Prioritize auditability, data validation, and usability over premature complexity
- Things to avoid:
  - Overengineering for enterprise scale
  - Bloated UI with too many mandatory fields
  - Weak authorization checks
  - Trusting client-side values without server-side validation
  - Storing secrets in frontend code or logs
