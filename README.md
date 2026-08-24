# Handoff

**Client & project management for freelancers.** Keep clients, projects, deliverables, requests, and invoices organized in one place — with a self-serve portal your clients can log into.

Built with **Next.js**, **TypeScript**, **Prisma** (PostgreSQL), **Better Auth**, and **zod**. Server-side logic lives in type-safe, validated **server actions**.

![MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![CI](https://github.com/codewithnuh/handoff/actions/workflows/ci.yml/badge.svg)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> ⚠️ Actively developed. The backend server actions and auth are in place; dashboard/client UI is still being built.

## Features

- **Workspaces** — each freelancer owns a single workspace (MVP).
- **Clients** — one directory per workspace, unique email per freelancer.
- **Projects** — status, progress (0–100%), start/due dates.
- **Deliverables** with versioned uploads and status transitions.
- **Requests** — client-initiated work items with status tracking.
- **Comments** — threaded on deliverables and requests (freelancer side).
- **Invoices** — project-level invoice tracking surfaced on the project detail view.
- **Activity timeline** — an audit trail of what changed and who did it.
- **Client portal** — magic-link invitation flow (planned).

## Tech stack

| Layer     | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Server Actions) |
| Language  | TypeScript (strict)                                          |
| Database  | PostgreSQL via [Prisma](https://prisma.io) 7 (`prisma-client` generator) |
| Auth      | [Better Auth](https://www.better-auth.com) + email/password  |
| Validation| [zod](https://zod.dev) 4                                    |
| Testing   | [Vitest](https://vitest.dev)                                 |
| Package   | pnpm                                                         |

## Getting started

Requirements: Node.js, pnpm, a PostgreSQL instance, and a `.env` file.

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment (copy the example and fill it in)
cp .env.example .env

# 3. Create the database schema (dev)
pnpm db:generate
pnpm db:push

# 4. Run the dev server
pnpm dev
```

Open <http://localhost:3000>.

### Environment variables

| Variable              | Description                    |
| --------------------- | ------------------------------ |
| `DATABASE_URL`        | PostgreSQL connection string   |
| `BETTER_AUTH_SECRET`  | Auth secret (min 32 chars)     |
| `BETTER_AUTH_URL`     | Public auth base URL           |
| `AUTH_SECRET`         | Auth secret (legacy/stub)      |
| `NEXT_PUBLIC_APP_URL` | Public app URL                 |

Values are validated at startup via `env.ts` (zod).

## Scripts

| Script             | Description                     |
| ------------------ | ------------------------------- |
| `pnpm dev`         | Start the dev server            |
| `pnpm build`       | Production build                |
| `pnpm start`       | Start the production server     |
| `pnpm test`        | Run tests (Vitest)              |
| `pnpm test:watch`  | Run tests in watch mode         |
| `pnpm lint`        | ESLint                          |
| `pnpm db:generate` | Regenerate the Prisma client    |
| `pnpm db:push`     | Push schema to the database     |
| `pnpm db:migrate`  | Create/apply migrations         |
| `pnpm db:studio`   | Open Prisma Studio              |

## Project structure

```
app/          App Router pages & API routes
components/   UI components
lib/actions/  Server actions (type-safe, validated, workspace-scoped)
lib/validation/zod schemas + inferred input types
lib/utils/    Response helpers
prisma/       Prisma schema & @@map tables
```

Every server action follows the same contract — it returns an
`ActionResponseType<T>` (`{ success, message, data }` on success,
`{ success: false, message, error: { code, fieldErrors? } }` on failure),
verifies auth/workspace ownership, validates input with zod, and maps DB
errors to standardized `ERROR_CODES`.

## Contributing

Contributions are welcome — bug reports, features, docs, and code. Before
opening a PR, please read the guides below.

- [Contributing guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./.github/SECURITY.md)
- [Bug report template](./.github/ISSUE_TEMPLATE/bug_report.yml)
- [Feature request template](./.github/ISSUE_TEMPLATE/feature_request.yml)

Every PR is checked by [CI](./.github/workflows/ci.yml) (lint, typecheck, and
tests must all pass).

## License

[MIT](./LICENSE) © 2026 [codewithnuh](https://github.com/codewithnuh)