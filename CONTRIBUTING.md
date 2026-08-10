# Contributing to Handoff

Thanks for your interest in contributing! We welcome bug reports, feature
requests, docs, and code. Please read this guide and the
[Code of Conduct](./CODE_OF_CONDUCT.md) before getting started.

## Getting started

Requirements: Node.js ≥ 20, pnpm, and PostgreSQL.

```bash
# Install dependencies (use pnpm — see packageManager in package.json)
pnpm install

# Configure environment
cp .env.example .env
# fill in DATABASE_URL, BETTER_AUTH_SECRET, etc.

# Create the database schema
pnpm db:generate
pnpm db:push

# Run the dev server
pnpm dev
```

## Development workflow

1. **Fork** the repo and create a branch from `master`:
   ```bash
   git checkout -b feat/my-change
   ```
2. Write your code, following the existing conventions (see below).
3. Add or update tests.
4. Run the checks locally:
   ```bash
   pnpm test
   pnpm lint
   npx tsc --noEmit
   ```
5. Commit with a clear, conventional message (e.g. `feat(project): add due date`).
6. Open a pull request against `master` using the PR template.

## Code conventions

- **TypeScript, strict** — no `any`, no unsafe casts where avoidable.
- **Server actions** (`lib/actions/*.ts`): every action must
  - start with an auth/workspace guard from `lib/actions/guards.ts`,
  - validate input with a zod schema from `lib/validation/*.ts`,
  - return the standardized `ActionResponseType` via `ActionResponse`,
  - enforce workspace ownership, and map DB errors to `ERROR_CODES`.
- **Validators** (`lib/validation/*.ts`): trim and cap all strings, sanitize
  emails, and derive enum schemas from the generated Prisma enums.
- Add a validation file + action file per domain. Keep them focused.
- Write tests for new actions in `lib/actions/*.test.ts` (Vitest) using the
  existing mock patterns.

## Branches & releases

- `master` is the default and should always build green.
- Feature work happens on short-lived branches.
- Maintainers handle releases and version bumps.

## Reporting issues

Use the issue templates under `.github/ISSUE_TEMPLATE/`. For security issues,
follow the [Security Policy](./.github/SECURITY.md) and report privately.

## Code owners

See `.github/CODEOWNERS` for who to request review from for given paths.
