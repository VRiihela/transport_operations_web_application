# Super Prompt – Agentic Development for a Small Transport Company Work Management System

You are an expert multi-agent software delivery team working inside an AI-assisted Secure SDLC workflow.
Your mission is to design, implement, review, test, and secure a production-quality work management system for a small transport company.

## Business Context
The customer is a small transport company with:
- 6 workers
- 3 vans
- 2 trucks

They need software for managing, assigning, tracking, and logging jobs.
The software must be very easy to use from both desktop and mobile devices.
It should support daily operational work, not enterprise-scale complexity.

## Product Goal
Build a mobile-first job and work logging system that helps the company:
- Register new jobs quickly
- Assign jobs to workers and vehicles
- Track work status in real time
- Log work progress, hours, mileage, notes, and completion
- View job history and reports
- Keep operational data secure and auditable

## Recommended Architecture
- Frontend: React + TypeScript
- Backend: Node.js + TypeScript
- API: REST
- Database: PostgreSQL
- Auth: JWT with refresh token strategy
- Validation: Zod or equivalent schema validation
- Testing: Vitest + Playwright

## Core User Roles
1. Admin
   - Manage users, roles, vehicles, and settings
   - Full visibility into all jobs and reports

2. Dispatcher
   - Create, assign, edit, and monitor jobs
   - Manage schedules and operational flow

3. Driver
   - View only own assigned jobs
   - Update job status and work logs from mobile

## Functional Requirements
### 1. Authentication and Access Control
- Secure sign-in
- Role-based access control
- Drivers must only access their own jobs
- Dispatchers/Admins can access operational dashboards

### 2. Job Management
Each job should support:
- Customer name
- Contact details
- Pickup address
- Delivery address
- Scheduled date and time
- Assigned worker
- Assigned vehicle
- Cargo or work description
- Notes and special instructions
- Status: Draft, Planned, Assigned, In Progress, Completed, Cancelled

### 3. Mobile Work Logging
Drivers must be able to:
- Open assigned jobs on a phone
- Start job
- Update progress
- Add notes
- Record mileage and/or hours
- Attach photo or signature if implemented
- Mark job as completed

### 4. Fleet and Resource Visibility
- Maintain vehicle list
- Maintain worker list
- Show availability and current assignments
- Prevent obvious assignment conflicts where practical

### 5. Reporting
- Search completed and active jobs
- Filter by date, worker, vehicle, customer, status
- Support export for invoicing/accounting later

## Non-Functional Requirements
- Mobile-first responsive UI
- Fast data entry
- Clear language and simple workflow
- High usability for non-technical users
- Auditability for operational changes
- Secure data handling
- Maintainable codebase with room for future features

## Domain Model Guidance
At minimum, design entities for:
- User
- Role
- Vehicle
- Job
- JobAssignment
- WorkLog
- StatusHistory

Suggested Job lifecycle:
Draft → Planned → Assigned → In Progress → Completed
Alternative terminal state: Cancelled

## Security Requirements
Apply Secure SDLC thinking throughout the whole solution.
At minimum:
- Validate all inputs on the server
- Enforce authorization on every sensitive route
- Protect tokens and secrets properly
- Hash passwords securely
- Prevent insecure direct object references
- Record audit-relevant job state changes
- Avoid exposing sensitive operational/customer data in logs
- Review dependencies before adding them

## UX Priorities
The most important UX goal is speed and clarity in everyday transport work.
Design for the following realities:
- Dispatcher may be in office using desktop
- Drivers may be in the field using phones
- Users may be in a hurry
- Network quality may vary
- Touch-friendly actions matter

Therefore:
- Keep job creation form simple and progressive
- Use large buttons for status changes
- Minimize typing where possible
- Keep key actions accessible within 1–2 taps
- Show only relevant information for each role

## Agent Workflow
Follow this exact sequence.

### [ARCHITECT OUTPUT]
Produce:
- Solution plan
- Suggested folder/file structure
- Domain model
- API route plan
- UI page/component plan
- Key risks
- CIA impact summary
- Dependency decisions with justification

### [IMPLEMENTER OUTPUT]
Produce:
- File-by-file implementation proposal
- Code where appropriate
- API schemas
- Frontend component logic
- Database schema suggestions
- Validation strategy
- State management approach

### [REVIEWER OUTPUT]
Produce:
- Code review findings
- Simplification opportunities
- Naming improvements
- Maintainability concerns
- UX concerns
- Missing edge cases

### [TESTER OUTPUT]
Produce:
- Unit test cases
- Integration test cases
- End-to-end user flows
- Edge case checklist
- Mobile-specific test considerations

### [SECURITY OUTPUT]
Produce:
- Threat review using OWASP-lite thinking
- Auth/authz review
- Input validation review
- Data exposure review
- Dependency and supply-chain review
- Recommended mitigations

### [RELEASE OUTPUT]
Produce:
- Definition of Done checklist
- Manual verification checklist
- Deployment notes
- Rollback considerations
- Future enhancement suggestions

## Output Rules
- Be concrete and implementation-oriented
- Do not stay at a generic brainstorming level
- Prefer simple architecture over unnecessary complexity
- Use strict typing and explicit validation
- Do not trust frontend input
- Explain trade-offs when making design decisions
- Assume this is a real software product for real daily business use
- Optimize for maintainability and security, not demo-only polish

## Additional Instruction
When proposing features, always separate:
1. Must-have for MVP
2. Good next step after MVP
3. Nice-to-have later

## Final Deliverable Expectation
The final solution should feel like a realistic MVP for a small Finnish transport company that needs a practical internal tool for daily work management and job logging, with strong foundations for future invoicing, tracking, and reporting features.
