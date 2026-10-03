# Beta release checklist

This checklist describes the code and evidence required for a self-hosted beta. The repository does not identify a production or staging provider. Replace each `Not run` entry with evidence from the actual staging environment before approving a release candidate.

## Fresh install

Use a new PostgreSQL database. Do not seed a hidden operator account or edit database rows by hand.

1. Install Node.js 22 or newer and pnpm 11.17.0. Install dependencies with `pnpm install --frozen-lockfile`.
2. Set `DATABASE_URL` to the new database. Set the public `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`. Generate separate random values for `AUTH_SECRET` and `BETTER_AUTH_SECRET`, each at least 32 characters.
3. Set production SMTP delivery values and a private UploadThing v7 token. Use the hosting provider's secret manager. Do not set `DEV_DATABASE_URL` in production.
4. Run `pnpm db:generate`, then `pnpm db:deploy`. Confirm the migration command succeeds before starting the app.
5. Run `pnpm build`, then `pnpm start`. Create the first user through `/register` and verify its address through the configured SMTP inbox.

For local development, create `handoff_dev`, copy `.env.example` to `.env`, set both database URLs to that local database, and run `pnpm db:generate`, `pnpm db:push`, and `pnpm dev`. `db:push`, `db:migrate`, `db:reset`, and `db:wipe` refuse remote targets and production mode.

## Health and dependency failures

`GET /api/health/live` returns 200 while the process can answer. It does not contact dependencies. `GET /api/health/ready` runs `SELECT 1` against PostgreSQL and returns 503 if the query fails. The response contains only a status value; logs include an error class name but no error message, connection string, or stack.

Readiness covers the database only. A successful response does not prove SMTP or UploadThing is reachable. Verify those services with the staging journey below. Invitation and reset actions report a failed email outcome; uploads and downloads report failure without returning private provider details. Operators should check provider status pages and credentials through their authenticated consoles.

## Staging smoke

Run this on the exact candidate commit with the staging PostgreSQL database, SMTP relay, and private UploadThing app configured:

1. Register a new freelancer and receive the verification email. Sign out, request a password reset, and use the one-time link. Verify reuse of an expired reset link fails.
2. Create a client and project, create and send an invitation, receive the real invitation email, and open its link in a private browser session.
3. Upload a project file. Confirm an unrelated account cannot download it. Download the file as the invited client and compare it with the upload.
4. Create an invoice, open its PDF, and check the displayed total against the saved line items.
5. Revoke the invitation/access, confirm an existing client session loses access, and confirm an expired invitation cannot create a session.
6. Stop staging PostgreSQL and verify `/api/health/live` stays 200 while `/api/health/ready` returns a generic 503. Restore the database, then check that invitation email and upload failures give a retryable user-facing outcome when those dependencies are deliberately unavailable.
7. Restore a populated database backup to an isolated database and follow [beta operations](./beta-operations.md). Confirm referenced UploadThing objects still download.

Do not run these tests with production credentials, customer data, or live storage objects.

## Release evidence manifest

Keep the filled manifest with the release review or private operations record. Link artifacts and workflow runs; never attach secrets, raw database URLs, SMTP credentials, or customer data.

```text
Candidate commit SHA:
Candidate tag (prepared, not published):
Required CI workflow URL and result:
Quality/typecheck result:
Unit tests and coverage summary:
PostgreSQL integration and concurrency result:
Migration fresh-install and populated-upgrade result:
Dependency audit result and exceptions:
Staging hosting provider and deployment URL:
Staging email, upload, download, PDF, expiry, and revocation result:
Health checks and controlled outage result:
Restore rehearsal record and observed data-loss window:
Known limitations:
Go/no-go owner and date:
```

The staging URL and operator record may contain sensitive infrastructure details. Keep them in an access-controlled review system.

## Deployment decision

Use `pnpm db:deploy` as a separate step before routing traffic. If migration fails, stop the rollout and fix forward. Roll back the application only after verifying the previous version supports the migrated schema. Do not restore an older backup over new writes without an incident decision and a plan to preserve those writes.

Preparing a candidate tag or notes does not publish a release or deploy production. A production go/no-go requires all manifest evidence, a named operator, and explicit deployment authorization.
