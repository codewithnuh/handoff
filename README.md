<div align="center">

# Handoff

**Open-source client & project management for freelancers**

Keep clients, projects, deliverables, requests, and invoices organized in one place — with a self-serve portal your clients can log into.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/codewithnuh/handoff/actions/workflows/ci.yml/badge.svg)](https://github.com/codewithnuh/handoff/actions)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)

[Getting Started](#getting-started) · [Features](#features) · [Tech Stack](#tech-stack) · [Screenshots](#screenshots) · [Contributing](#contributing) · [License](#license)

</div>

---

## What is Handoff?

Handoff is a **self-hosted, open-source** platform built specifically for freelancers and small creative teams. It replaces the scattered mess of spreadsheets, email threads, and generic project tools with a purpose-built workflow:

- **You** get a dashboard to manage everything — clients, projects, deliverables, tasks, invoices.
- **Your clients** get a clean portal where they can track progress, approve deliverables, request changes, leave comments, and download invoices — without needing an account.

No vendor lock-in. No per-seat pricing surprises. Your data lives on your own PostgreSQL database.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
  - [Server Actions](#server-actions)
  - [Authentication](#authentication)
  - [Client Portal](#client-portal)
  - [Role-Based Access Control](#role-based-access-control)
  - [File Uploads](#file-uploads)
  - [Email](#email)
  - [Plan Limits](#plan-limits)
- [Database Schema](#database-schema)
- [Scripts](#scripts)
- [API Routes](#api-routes)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Security](#security)
- [License](#license)

---

## Features

### Freelancer Dashboard

| Feature | Description |
|---------|-------------|
| **Workspaces** | Each freelancer owns a workspace. Switch between workspaces from the sidebar. |
| **Client Directory** | Create and manage clients with name, email, and company. Unique email per workspace. |
| **Project Management** | Full project lifecycle — create, track status (Planning → In Progress → Completed → Cancelled), monitor progress (0–100%), set start/due dates. |
| **Deliverables** | Create deliverables per project. Upload versioned files. Track status through DRAFT → IN_REVIEW → CHANGES_REQUESTED → APPROVED. Optimistic locking prevents conflicting edits. |
| **Kanban Task Board** | Drag-and-drop tasks across TODO, IN_PROGRESS, and DONE columns. Assign tasks to team members with due dates. |
| **Client Requests** | Clients submit work requests through their portal. You track them with status transitions (OPEN → IN_PROGRESS → COMPLETED). |
| **Invoicing** | Create invoices with line items, discounts, tax rates, and auto-generated invoice numbers (INV-001, INV-002…). Convert approved deliverables to invoice line items. Generate PDF invoices. Send, mark paid, or cancel. |
| **Comments** | Threaded comments on deliverables and requests — both you and your clients can participate. |
| **Activity Timeline** | Audit trail of every action — who did what, when. Covers project changes, deliverable updates, invoices, and client portal activity. |
| **Link Tracking** | Centralized view of all invitation links (team + client) with status (Active / Expired / Accepted). Bulk revoke. |

### Client Portal

| Feature | Description |
|---------|-------------|
| **Magic Link Access** | Clients receive an invitation link. No account needed — one click and they're in. |
| **Project View** | Clients see all their projects with status, progress bars, deliverable counts, and request counts. |
| **Deliverable Actions** | Approve deliverables or request changes with optional comments. Version-aware — actions are tied to specific versions. |
| **File Downloads** | Download deliverable files directly through the portal. |
| **Comments** | Leave feedback on deliverables and requests. |
| **Create Requests** | Submit new work requests directly from the portal. |
| **Invoice Access** | View invoices, download PDFs, see payment status. |
| **Session Management** | 7-day sessions with secure, signed cookies. Logout button in the portal header. |

### Team Management

| Feature | Description |
|---------|-------------|
| **Invite Teammates** | Send email invitations with project assignments and role/permission configuration. |
| **Roles** | Workspace roles (Owner, Admin, Member) and project roles (Lead, Contributor, Observer). |
| **Granular Permissions** | Control who can manage workspace, members, clients, projects, billing, and who can view all projects. |
| **Project Assignments** | Assign team members to specific projects with role-based access. |
| **Need-to-Know Scoping** | Members only see clients and projects they're assigned to (unless they have VIEW_ALL_PROJECTS). |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Server Actions) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org) (strict mode) |
| **Database** | [PostgreSQL](https://www.postgresql.org) via [Prisma 7](https://prisma.io) ORM |
| **Authentication** | [Better Auth](https://www.better-auth.com) (email/password + OTP verification) |
| **Validation** | [Zod 4](https://zod.dev) (runtime schema validation) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| **File Uploads** | [UploadThing](https://uploadthing.com) |
| **PDF Generation** | [React PDF Renderer](https://react-pdf.org) |
| **Email** | [Nodemailer](https://nodemailer.com) |
| **Animations** | [Motion](https://motion.dev) (Framer Motion) |
| **Drag & Drop** | [dnd-kit](https://dndkit.com) |
| **Testing** | [Vitest](https://vitest.dev) |
| **Package Manager** | [pnpm](https://pnpm.io) |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **PostgreSQL** ≥ 14
- **SMTP server** (for emails in production; optional in dev)
- **UploadThing account** (for file uploads)

### Installation

```bash
# Clone the repository
git clone https://github.com/codewithnuh/handoff.git
cd handoff

# Install dependencies
pnpm install
```

### Environment Variables

```bash
cp .env.example .env
```

Fill in the required variables:

```env
# Required — PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/handoff"

# Required — Better Auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET="replace-with-a-long-random-secret-at-least-32-chars"

# Required — Public auth base URL
BETTER_AUTH_URL="http://localhost:3000"

# Required — Legacy auth secret (kept for compatibility)
AUTH_SECRET="replace-with-a-random-secret"

# Required — Public app URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Required for production — SMTP email config
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM="Handoff <no-reply@yourdomain.com>"

# Required for file uploads — Get from https://uploadthing.com/dashboard
UPLOADTHING_SECRET="sk_live_your_uploadthing_secret_here"
```

> All environment variables are validated at startup using Zod (`env.ts`). The app will throw immediately if required values are missing or malformed.

### Database Setup

```bash
# Generate the Prisma client
pnpm db:generate

# Push the schema to your database (dev)
pnpm db:push

# Or run migrations (recommended)
pnpm db:migrate
```

### Running the App

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
handoff/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public pages (landing, about, etc.)
│   ├── api/                      # API routes
│   │   ├── auth/[...all]/        # Better Auth catch-all
│   │   ├── uploadthing/          # File upload handler
│   │   ├── portal/accept/        # Client portal token acceptance
│   │   ├── files/[id]/download/  # Secure file downloads
│   │   └── invoices/[id]/pdf/    # Invoice PDF generation
│   ├── dashboard/                # Freelancer dashboard
│   │   ├── clients/              # Client directory
│   │   ├── projects/             # Project list + detail
│   │   ├── portal/               # Client portal management
│   │   ├── team/                 # Team management
│   │   ├── settings/             # User settings
│   │   ├── billing/              # Plan & billing
│   │   └── links/                # Invitation link tracking
│   ├── portal/                   # Client-facing portal
│   │   ├── (client)/             # Authenticated portal pages
│   │   └── expired/              # Session expired page
│   └── invite/                   # Team invitation acceptance
├── components/
│   ├── ui/                       # shadcn/ui primitives (27 components)
│   ├── auth/                     # Login, register, verify, reset forms
│   ├── landing-page/             # Landing page sections
│   ├── dashboard/                # Dashboard components
│   │   ├── project/              # Project detail (deliverables, tasks, invoices)
│   │   ├── team/                 # Team management UI
│   │   └── billing/              # Plan cards & usage
│   ├── portal/                   # Client portal components
│   └── legal/                    # Legal page layouts
├── lib/
│   ├── actions/                  # Server actions (type-safe, validated)
│   ├── auth.ts                   # Better Auth server config
│   ├── auth-client.ts            # Better Auth client config
│   ├── prisma.ts                 # Prisma client singleton
│   ├── portal.ts                 # Client portal auth utilities
│   ├── uploadthing.ts            # File upload router
│   ├── email.ts                  # Email service (Nodemailer)
│   ├── invoice-pdf.tsx           # PDF invoice renderer
│   ├── validation/               # Zod schemas per domain
│   ├── queries/                  # Database query functions
│   ├── constants/                # Error codes, plan limits, etc.
│   ├── services/                 # Business logic (plan limits, etc.)
│   ├── types/                    # Shared TypeScript types
│   └── utils/                    # Response helpers
├── hooks/                        # Custom React hooks
├── prisma/                       # Prisma schema & migrations
├── scripts/                      # Utility scripts
├── public/                       # Static assets
└── env.ts                        # Environment variable validation
```

---

## Architecture

### Server Actions

All business logic lives in **server actions** under `lib/actions/`. Every action follows the same contract:

1. **Authenticate** — `requireAuth()` verifies the user is signed in.
2. **Authorize** — `requireWorkspace()` resolves the active workspace and role. Additional guards enforce permissions.
3. **Validate** — Input is validated with Zod schemas from `lib/validation/`.
4. **Execute** — Database operations via Prisma.
5. **Respond** — Returns a standardized `ActionResponseType<T>`:

```typescript
// Success
{ success: true, message: "Project created", data: { id, name, ... } }

// Failure
{ success: false, message: "Validation failed", error: { code: "VALIDATION_ERROR", fieldErrors: {...} } }
```

All errors are mapped through `toActionError()` which handles Better Auth errors, Prisma known errors, and unknown errors uniformly.

### Authentication

Handoff uses **Better Auth** with:

- **Email + password** sign-in (min 8, max 128 characters)
- **OTP email verification** (6-digit code, 10-minute expiry, max 5 attempts)
- **Password reset** via email link
- **Rate limiting**: 60 req/min general, 5/min sign-in, 3/min sign-up, 5/min password reset
- **Sessions**: 7-day expiry, refreshes every 24 hours
- **Secure cookies**: HttpOnly, Secure (production), SameSite=Lax

### Client Portal

The client portal uses a **separate auth system** (not Better Auth):

1. Freelancer sends an invitation via the dashboard.
2. Client receives a **magic link** with a unique token.
3. Token is accepted at `/api/portal/accept` → creates `ProjectAccess` + `ClientSession`.
4. Client receives a signed `cp_session` cookie (HMAC-SHA256).
5. Portal pages verify the cookie and scope data to the client's email.
6. 7-day session lifetime. Logout clears the cookie.

### Role-Based Access Control

**Workspace Roles:**
| Role | Permissions |
|------|-------------|
| **Owner** | Full access, cannot be removed |
| **Admin** | MANAGE_WORKSPACE, MANAGE_MEMBERS, MANAGE_CLIENTS, MANAGE_PROJECTS, CREATE_PROJECTS, VIEW_ALL_PROJECTS, MANAGE_BILLING |
| **Member** | Granular permissions assigned per member |

**Workspace Permissions:**
- `MANAGE_WORKSPACE` — rename workspace, delete workspace
- `MANAGE_MEMBERS` — invite/remove team members, change roles
- `MANAGE_CLIENTS` — create/edit/delete clients
- `MANAGE_PROJECTS` — edit/delete any project
- `CREATE_PROJECTS` — create new projects
- `VIEW_ALL_PROJECTS` — see all workspace projects (vs. only assigned)
- `MANAGE_BILLING` — manage subscription

**Project Roles:**
| Role | Access |
|------|--------|
| **Lead** | Full project access, can manage deliverables |
| **Contributor** | Can work on deliverables |
| **Observer** | Read-only access |

### File Uploads

Powered by **UploadThing** with these upload limits:

| Type | Limit |
|------|-------|
| Images | 16 MB |
| PDFs | 32 MB |
| Text files | 8 MB |
| ZIP archives | 32 MB |
| Office documents | 16 MB |

Files are stored on UploadThing's CDN. The app keeps a `File` record in the database linking to the storage key.

### Email

Emails are sent via **Nodemailer** with configurable SMTP:

- **Verification OTP** — 6-digit code for email verification
- **Password Reset** — Link with token
- **Team Invitation** — Set-password link with project assignments

In development, emails are logged to the console when SMTP is not configured. In production, missing SMTP config throws an error.

### Plan Limits

| Plan | Workspaces | Projects | Price |
|------|-----------|----------|-------|
| **FREE** | 1 | 3 | $0/mo |
| **PRO** | 5 | 100 | $12/mo |

Enforced at creation time. After downgrade, a 7-day grace period keeps existing data accessible in read-only mode.

---

## Database Schema

### Core Models

```
User ─┬─ Workspace (1:N, owner)
      ├─ WorkspaceMember (1:N)
      ├─ ProjectMember (1:N)
      ├─ Session (1:N)
      ├─ Account (1:N)
      ├─ Subscription (1:1)
      └─ activeWorkspace → Workspace (N:1)

Workspace ─┬─ Client (1:N)
           ├─ Project (1:N)
           ├─ WorkspaceMember (1:N)
           └─ TeamInvitation (1:N)

Project ─┬─ Client (N:1)
         ├─ Deliverable (1:N)
         ├─ Request (1:N)
         ├─ Invoice (1:N)
         ├─ Task (1:N)
         ├─ Activity (1:N)
         ├─ ProjectMember (1:N)
         ├─ ClientInvitation (1:N)
         └─ ProjectAccess (1:N)

Deliverable ─┬─ DeliverableVersion (1:N)
             ├─ Comment (1:N)
             └─ InvoiceLineItem (1:N)

Request ── Comment (1:N)

Invoice ── InvoiceLineItem (1:N)

Client ─┬─ Project (1:N)
        └─ ClientSession (via email)
```

### Enums

| Enum | Values |
|------|--------|
| `ProjectStatus` | PLANNING, IN_PROGRESS, COMPLETED, CANCELLED |
| `DeliverableStatus` | DRAFT, IN_REVIEW, CHANGES_REQUESTED, APPROVED |
| `RequestStatus` | OPEN, IN_PROGRESS, COMPLETED |
| `InvoiceStatus` | DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| `TaskStatus` | TODO, IN_PROGRESS, DONE |
| `SubscriptionPlan` | FREE, PRO |
| `SubscriptionStatus` | ACTIVE, TRIALING, PAST_DUE, PAUSED, CANCELLED |
| `WorkspaceRole` | ADMIN, MEMBER |
| `WorkspacePermission` | MANAGE_WORKSPACE, MANAGE_MEMBERS, MANAGE_CLIENTS, MANAGE_PROJECTS, CREATE_PROJECTS, VIEW_ALL_PROJECTS, MANAGE_BILLING |
| `ProjectRole` | LEAD, CONTRIBUTOR, OBSERVER |
| `ActivityType` | PROJECT_CREATED, CLIENT_INVITED, DELIVERABLE_CREATED, DELIVERABLE_SUBMITTED, DELIVERABLE_VERSION_UPLOADED, CHANGES_REQUESTED, DELIVERABLE_APPROVED, COMMENT_ADDED, REQUEST_CREATED, REQUEST_STATUS_CHANGED, INVOICE_CREATED, INVOICE_SENT, INVOICE_PAID, PROJECT_STATUS_CHANGED, PROJECT_PROGRESS_UPDATED |

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:push` | Push schema changes to the database |
| `pnpm db:migrate` | Create and apply migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:reset` | Reset the database (drop all data) |
| `pnpm db:studio` | Open Prisma Studio (visual DB browser) |
| `pnpm db:deploy` | Deploy migrations to production |
| `pnpm db:wipe` | Wipe ALL tables (development only) |

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...all]` | GET, POST | Better Auth catch-all (sign-in, sign-up, session, password reset, OTP) |
| `/api/uploadthing` | GET, POST | File upload handler |
| `/api/portal/accept?token=...` | GET | Accept client portal invitation, create session |
| `/api/files/[id]/download` | GET | Secure file download (verifies portal session) |
| `/api/invoices/[id]/pdf` | GET | Generate and serve invoice PDF |

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Configure environment variables.
4. Set up a PostgreSQL database (e.g., [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)).
5. Add `UPLOADTHING_SECRET` and SMTP credentials.
6. Deploy.

### Docker

A `Dockerfile` is not yet provided. Contributions welcome!

### Manual

```bash
# Build
pnpm db:generate
pnpm build

# Start
pnpm start
```

---

## Contributing

Contributions are welcome — bug reports, features, docs, and code.

### Quick Start

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/handoff.git
cd handoff

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Set up database
pnpm db:generate
pnpm db:push

# Run dev server
pnpm dev
```

### Guidelines

- **Branch from `master`** — `feat/my-change`, `fix/my-bug`
- **No `any`** — strict TypeScript always
- **Test your changes** — `pnpm test`
- **Lint passes** — `pnpm lint && npx tsc --noEmit`
- **Conventional commits** — `feat:`, `fix:`, `docs:`, `chore:`
- **Server actions**: auth guard → workspace guard → validate → execute → return `ActionResponseType`

### Project Conventions

- **Validation schemas** live in `lib/validation/*.ts`
- **Server actions** live in `lib/actions/*.ts`
- **Tests** live next to actions: `lib/actions/*.test.ts`
- **Components** are organized by domain in `components/dashboard/`
- **Error handling** uses a single `toActionError()` function
- **Constants** live in `lib/constants/`

Read the full [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Roadmap

- [ ] Client portal UI polish and mobile responsiveness
- [ ] Real-time notifications (WebSocket)
- [ ] Team chat / messaging
- [ ] Time tracking
- [ ] Expense tracking
- [ ] Recurring invoices
- [ ] Multi-currency support
- [ ] Custom branding / white-label
- [ ] Integrations (Slack, Zapier, Stripe)
- [ ] Mobile apps (React Native)
- [ ] Docker deployment
- [ ] More OAuth providers (Google, GitHub)

---

## Security

Security is taken seriously. See the full [Security Policy](./.github/SECURITY.md).

**Key measures:**
- Passwords hashed with **bcrypt**
- Sessions: signed, HttpOnly, Secure cookies
- Client portal cookies signed with **HMAC-SHA256**
- Rate limiting on all auth endpoints
- Zod validation on all inputs
- Workspace-scoped data access (no cross-workspace leakage)
- Optimistic locking on deliverable updates
- Files served through UploadThing CDN (not directly from your server)

**Reporting vulnerabilities:** Please email security issues privately. Do not open public GitHub issues for security vulnerabilities.

---

## License

[MIT](./LICENSE) © 2026 [codewithnuh](https://github.com/codewithnuh)

---

<div align="center">

**Built with care for the freelance community.**

[Star this repo](https://github.com/codewithnuh/handoff) · [Report a bug](https://github.com/codewithnuh/handoff/issues) · [Request a feature](https://github.com/codewithnuh/handoff/issues)

</div>
