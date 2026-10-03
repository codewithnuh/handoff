# Contributing to Handoff

Thanks for your interest in contributing! We welcome bug reports, feature
requests, docs, and code. Please read this guide and the
[Code of Conduct](./CODE_OF_CONDUCT.md) before getting started.

Domain vocabulary lives in [CONTEXT.md](./CONTEXT.md) — when a code
identifier and a term there disagree, the term in CONTEXT.md wins.

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

In development you do not need an inbox: the email-verification OTP is
printed to the console (`🔑 [DEV OTP] Code for …`).

## Development workflow

1. **Fork** the repo and create a branch from `master`:
   ```bash
   git checkout -b feat/my-change
   ```
2. Write your code, following the existing conventions (see below).
3. Add or update tests.
4. Run the checks locally — this is exactly what CI runs, in order:
   ```bash
   pnpm lint
   pnpm exec tsc --noEmit
   pnpm test
   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/handoff_test pnpm test:integration
   pnpm build # CI's second job; required for changes to routes, env, or config
   ```
   Create the local `handoff_test` database before the first integration run. In PowerShell, set `$env:TEST_DATABASE_URL` to the same URL before running `pnpm test:integration`. The integration runner refuses remote hosts, any database name other than `handoff_test`, and never falls back to `DATABASE_URL` from `.env`.
5. Commit with a clear, conventional message (e.g. `feat(project): add due date`).
6. Open a pull request against `master` using the PR template.

## Code conventions

- **TypeScript, strict** — no `any`, no unsafe casts where avoidable.
- **Server actions** (`lib/actions/*.ts`): build every action with the shared
  pipeline instead of hand-rolling try/catch:
  ```ts
  export const createThing = defineAction({
    schema: createThingSchema,     // Zod schema from lib/validation/*.ts
    guard: requireWorkspace,       // optional — this is the default when omitted;
                                   // pass a custom guard for project-scoped actions,
                                   // or null only for pre-session actions
    check: [planLimitCheck],       // optional: one or more bands, run after the guard
    revalidate: true,              // optional: refresh the dashboard cache on success
    run: async (input, ctx) => {
      // ...your logic
      return ActionResponse.success(data, "Thing created");
    },
  });
  ```
  The pipeline validates, guards, runs checks, maps every throw onto the one
  `ActionResponseType` envelope, and revalidates. Never copy those bands.
- **Validators** (`lib/validation/*.ts`): trim and cap all strings, sanitize
  emails, and derive enum schemas from the generated Prisma enums via
  `enumTuple()` (`lib/validation/shared.ts`). Never hardcode enum arrays.
- **Authorization** lives in `lib/access/` (workspace / project / portal).
  Resolve the caller with `getRequestSubject()`; never inline permission
  checks or revive per-file guard helpers.
- **Client calls**: invoke server actions through `useServerAction`
  (`hooks/use-server-action.ts`). Timeout, rollback, refresh, and toasts are
  configured there (including function-form titles so copy stays exact) —
  components must not call `withTimeout` or build transport code themselves.
- Add a validation file + action file per domain. Keep them focused.

## Architecture

### Action pipeline

`defineAction()` (`lib/actions/define.ts`) is the only way to build a server
action. Bands: validate → guard → checks → run → revalidate, with every
thrown error mapped by `toActionError()` (below). Omitting `guard` means
`requireWorkspace()`; `guard: null` is for actions that must run before a
session exists (sign-in, sign-up, OTP verification).

### Error handling

`toActionError()` (`lib/actions/helpers.ts`) maps (in order): Better Auth
`APIError` (by HTTP status), Prisma known errors (P2002→CONFLICT,
P2025→NOT_FOUND, P2003→referenced, …), and unknown errors (logged,
INTERNAL_ERROR). `defineAction` calls it for you. Never create local error
mappers.

### Validation

Schemas live in `lib/validation/*.ts` (one per domain). Enum values are
derived from Prisma via `enumTuple()` from `lib/validation/shared.ts` so they
stay in sync automatically.

### Queries

Read models live in `lib/queries/` — one file per view
(`dashboard.ts`, `portal.ts`, `project-detail.ts`, …). The project detail
view has one query shape with two adapters: the dashboard viewer and the
portal client (which explicitly projects fields — that projection is a
security boundary, not an optimization).

### Presentational vocabulary

- Date/currency formatting: `lib/presentational/format.ts` — one function
  per format, null-fallbacks as parameters. No local `formatDate` copies.
- Status labels: `lib/presentational/status.ts` — one label+variant map per
  enum. Deliberate divergences are named (`INVOICE_STATUS_CONFIG_PORTAL`).
- Shared shells: `components/presentational/` — `EmptyState`, `ErrorPanel`,
  route skeletons. Route `error.tsx` files render `ErrorPanel`; route
  skeletons are reached through `loading.tsx`.

### Shared constants

Time constants (e.g. invitation TTL) live in `lib/constants/`. Import from
there — never inline magic numbers like `7 * 24 * 60 * 60 * 1000`.

### UI components

Shared stateful components live in domain subdirectories under
`components/dashboard/` (e.g. `team/members-section.tsx`). Keep the
index.tsx as the public API and split large files (>400 lines) into focused
sub-components. Shared status/label maps belong in
`lib/presentational/status.ts`, not in per-component `constants.ts` files.

### Tests

Vitest has separate unit and PostgreSQL integration commands. `pnpm test` runs unit tests against `lib/test/fake-db.ts`. `pnpm test:integration` applies committed migrations and runs real Prisma queries against a dedicated local PostgreSQL 16 database named `handoff_test`.

From a clean checkout with local PostgreSQL available:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
createdb handoff_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/handoff_test pnpm test:integration
```

On PowerShell, set `$env:TEST_DATABASE_URL` to that local URL, then run `pnpm test:integration`. The database must already exist. Use local credentials for your PostgreSQL installation if they differ from the example.

Integration fixtures use reserved `itest_` IDs, fixed timestamps, and cleanup limited to those fixture records. Never point integration tests at a development or production database. The runner requires `TEST_DATABASE_URL`, validates the local host and exact database name before migrating, and sets `DATABASE_URL` only in the child processes it starts. No SMTP credentials, storage credentials, production secrets, or paid services are needed.

Tests are colocated with what they cover:

- actions: `lib/actions/*.test.ts`
- access: `lib/access/access.test.ts`
- invoice money/numbering: `lib/invoice/money.test.ts`
- validation: `lib/validation/*.test.ts`
- client hook: `hooks/use-server-action.test.tsx`

Unit DB-backed tests run against the shared fake in `lib/test/fake-db.ts`
(mocked `@/lib/prisma`), plus mocked `@/lib/auth`, `next/headers`, and
`next/cache`. The fake's `$transaction` is a bare `vi.fn()` — tests that hit
transactional code must add
`vi.mocked(db.$transaction).mockImplementation(async (fn) => fn(db as never))`.
For `better-auth/api` errors, import `APIError` directly from
`better-auth/api` (no mocking needed — the real class works in tests).

## Branches & releases

- `master` is the default and should always build green.
- Feature work happens on short-lived branches.
- Maintainers handle releases and version bumps.

## Reporting issues

Use the issue templates under `.github/ISSUE_TEMPLATE/`. For security issues,
follow the [Security Policy](./.github/SECURITY.md) and report privately.

## Code owners

See `.github/CODEOWNERS` for who to request review from for given paths.
