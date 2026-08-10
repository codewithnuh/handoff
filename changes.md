# Changes — Authentication & Forgot Password

Full Better Auth setup (register / login / logout / forgot password / reset password / session), replacing the old raw-`bcrypt` placeholder.

## Skills reviewed first

- `.agents/skills/better-auth-best-practices` — adapter/model-name rules, Prisma generate workflow
- `.agents/skills/create-auth` — server config, `nextCookies()` plugin, route handler
- `.agents/skills/email-and-password-best-practices` — password reset + verification flows, mock email approach
- `.agents/skills/better-auth-security-best-practices` — secret, rate limiting, CSRF/origins, cookies

## 1. Prisma schema (`prisma/schema.prisma`)

`User` model updated for Better Auth:

- **Removed** `passwordHash` (Better Auth stores the hashed password on the `Account` row)
- **Added** `emailVerified Boolean @default(false)` and `image String?`
- **Added** relations `sessions Session[]` and `accounts Account[]`

New Better Auth tables:

- `Session` (→ `sessions`) — session tokens, IP/user-agent, `onDelete: Cascade`
- `Account` (→ `accounts`) — credentials + OAuth providers; `password` holds the hash for email/password
- `Verification` (→ `verifications`) — email-verification + password-reset tokens

## 2. Migration

- `prisma migrate dev --name add_better_auth_models` → applied `20260810101744_add_better_auth_models`
- `prisma generate` → regenerated client to `app/generated/prisma` (includes `Session`/`Account`/`Verification`, `User.emailVerified`)

## 3. Environment (`env.ts`)

- Server schema now validates `BETTER_AUTH_SECRET` (min 32 chars) and `BETTER_AUTH_URL`
- `.env` already contained both (verified: secret length 64)

## 4. Better Auth config (`lib/auth.ts`)

- **Prisma adapter**: `prismaAdapter(db, { provider: "postgresql" })` (uses the shared `db` from `lib/prisma.ts`)
- **Env-driven**: `baseURL`/`secret` from `env`
- **emailAndPassword**: enabled, password length 8–128, `sendResetPassword` handler
- **emailVerification**: `sendOnSignUp`, auto sign-in after verification, `sendVerificationEmail` handler
- **Session**: 7-day expiry, 24h refresh
- **Rate limiting**: enabled (60 req / 60s window) with tighter per-endpoint rules on auth endpoints (`sign-in` 5/min, `sign-up` 3/min, reset 5/min)
- **Security**: secure cookies in production, `sameSite: lax`, default CSRF + origin checks kept ON
- **`nextCookies()`** plugin for Next.js server actions/components
- Exports `type Session = typeof auth.$Infer.Session` and `type AuthUser`

## 5. Email transport (`lib/email.ts`)

- `sendEmail()` mock that logs to console (verification + reset emails).
- **Safeguard**: throws in `NODE_ENV === "production"` so emails can never be silently dropped.
- **TODO before shipping**: swap with a real provider (Resend, SES, Postmark, …).

## 6. Validation (`lib/validation/auth.ts`)

- `registerSchema` (name, email, password 8–128)
- `loginSchema` (email, password)
- `requestPasswordResetSchema` (email)
- `resetPasswordSchema` (newPassword 8–128, token)
- Removed the old `lib/validation/user.ts`

## 7. Server actions (`lib/actions/auth.ts`) — standardized responses

All actions return the existing `ActionResponseType<T>` union (`{ success, message, data }` / `{ success, error: { code, fieldErrors } }`):

| Action | Better Auth call | Data on success |
|---|---|---|
| `register` | `auth.api.signUpEmail` | `{ user }` |
| `login` | `auth.api.signInEmail` | `{ user }` |
| `logout` | `auth.api.signOut` | `{ success }` |
| `requestPasswordReset` | `auth.api.requestPasswordReset` | `{ status }` — always reports success (anti user-enumeration) |
| `resetPassword` | `auth.api.resetPassword` | `{ status }` |
| `getSession` | `auth.api.getSession` | session or `null` |

- Inputs validated with zod; `fieldErrors` attached to `VALIDATION_ERROR` responses
- `APIError` → mapped to standardized error codes: 400/422 → `VALIDATION_ERROR`, 401 → `UNAUTHORIZED`, 403 → `FORBIDDEN`, 409 → `CONFLICT`, 429 → `RATE_LIMITED` (added to `ERROR_CODES`), else `INTERNAL_ERROR`

**Removed** obsolete `lib/actions/user.ts` + `lib/actions/user.test.ts` (raw-bcrypt `createUser` superseded by `register`).

## 8. Tests (`lib/actions/auth.test.ts`)

- 18 tests, all mocking `auth.api` and `next/headers`
- **Type-safe**: `expectTypeOf` asserts every action returns `ActionResponseType<...>` and narrows `result.data`
- Covers: validation errors, success paths, and error-code mapping (duplicate account, invalid credentials, invalid token, rate limit, 500s)

## 9. Verification

- `pnpm test` → 18/18 passed
- `npx tsc --noEmit` → clean (after `npx next typegen`; the pre-existing `LayoutProps` template error is resolved by regenerating `.next` route types — `.next` is gitignored build output)
- `pnpm lint` → clean
- **End-to-end** against a real dev server + Postgres: `/api/auth/ok`, sign-up, sign-in, request reset (email logged with token), reset password, sign-in with new password — all succeeded; DB rows confirmed (`accounts.providerId = credential`, password hash length 161); test data cleaned up
- Also verified the CSRF origin check rejects untrusted origins (security layer working)

## Next steps (not done — out of scope)

- Real email provider in `lib/email.ts`
- Auth UI pages (sign-in / sign-up / forgot / reset) — user explicitly said no UI needed
- Email verification "required" mode (`requireEmailVerification`) if stricter sign-in gating is wanted

# Changes — CRUD Server Actions (Workspace, Clients, Projects, …)

Server actions + validation for the freelancer-facing business models in `prisma/schema.prisma`. Built on the existing `ActionResponse` / `ActionResponseType` contract and zod validation used by auth.

## Shared infrastructure

- `lib/validation/shared.ts` — reusable zod primitives (trimmed/capped strings, `z.email()` with trim+lowercase, IDs, dates, amount, progress, non-negative int) and enum schemas derived from the generated Prisma enums (`Project/Deliverable/Request/InvoiceStatus`) so validators stay in sync with the schema.
- `lib/actions/guards.ts` — `requireAuth()` and `requireWorkspace()` (freelancer's single workspace by `ownerId`), plus `requireProjectInWorkspace` / `requireClientInWorkspace` ownership checks. Returns a `Guarded<T>` (typed payload or ready-to-return `ActionError`).
- `lib/actions/helpers.ts` — `toActionError()` mapping Prisma known errors to `ERROR_CODES`: P2002 → CONFLICT, P2025 → NOT_FOUND, P2003/P2014 → CONFLICT (referenced), else DATABASE_ERROR/INTERNAL_ERROR.
- `lib/actions/activity.ts` — `recordActivity()` for the timeline; failures are logged, never break the primary mutation.
- `lib/utils/serializers.ts` — `serializeInvoice` (Decimal `amount` → string) so invoice responses are JSON-safe and type-safe.

## Validation (`lib/validation/*.ts`)
One file per domain (`workspace`, `client`, `project`, `deliverable`, `request`, `comment`, `invoice`, `file`, `invitation`), each exporting zod schemas + inferred `XxxInput` types.

## Server actions (`lib/actions/*.ts`) — `"use server"`
Every action: guard → `safeParse` (VALIDATION_ERROR + fieldErrors) → try/catch → `ActionResponse`. Reads return `{ items }` (lists) or the entity; writes return the entity. All scoped to the caller's workspace.

| File | Actions |
|---|---|
| workspace | `getCurrentWorkspace`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace` (⚠️ destructive) |
| client | `listClients`, `getClient`, `createClient`, `updateClient`, `deleteClient` |
| project | `listProjects`, `getProject`, `createProject`, `updateProject`, `updateProjectStatus`, `updateProjectProgress`, `deleteProject` (+ activity logging) |
| deliverable | `listDeliverables`, `getDeliverable`, `createDeliverable`, `updateDeliverable`, `deleteDeliverable`, `addDeliverableVersion` (auto version number) |
| request | `listRequests`, `getRequest`, `createRequest`, `updateRequest`, `updateRequestStatus`, `deleteRequest` |
| comment | `listDeliverableComments`, `listRequestComments`, `createCommentOnDeliverable`, `createCommentOnRequest`, `deleteComment` (own comments only) |
| invoice | `listInvoices`, `getInvoice`, `createInvoice`, `updateInvoice`, `updateInvoiceStatus`, `deleteInvoice` |
| file | `listFiles`, `getFile`, `createFile`, `deleteFile` (storage metadata) |
| invitation | `inviteClient` (random token, 7d expiry), `listClientInvitations` |

## Verification
- `npx tsc --noEmit` → clean
- `pnpm test` → **37 passed / 0 failed** (auth, client, project, invoice suites all green)
- `npx eslint` on the new files → clean

**Also fixed (pre-existing auth test failures):** `lib/actions/auth.ts` `login` incorrectly checked `(await getSession()).success` to decide whether a user was already signed in — but `getSession()` returns `success: true` even when signed out (with `data: null`), so `login` always short-circuited to `ALREADY_SIGNED_IN`. It now checks `sessionState.success && sessionState.data` (an actual session). The `login` tests in `lib/actions/auth.test.ts` also now default the session lookup to `null` to simulate a signed-out user.

## Out of scope (same as before)
- Client portal auth (accepting invitations, `ProjectAccess`, `ClientSession`) — separate client-facing flow
- Real file upload / email in `recordActivity` side effects
- `revalidatePath("/")` is a placeholder arena constant until real UI routes exist.

