# Beta operations and recovery

This guide is for an operator of a self-hosted beta. The repository does not identify a live hosting account or PostgreSQL provider, so provider dashboard names and observed backup results must be recorded by the operator for each rehearsal. Never use production credentials or data in CI.

## Beta recovery targets

Start with an operator-managed daily encrypted PostgreSQL backup and a target **RPO of 24 hours** (maximum planned data loss) and **RTO of 4 hours** (time to restore service). These are proposed beta targets, not measured guarantees. They become commitments only after the deployment's backup schedule, retention, storage preservation, access controls, monitoring, and timed restore all meet them. Keep at least 7 daily restore points in provider-managed, access-controlled storage. Restrict backup retrieval to the named operator and one recovery custodian; enable provider encryption at rest and in transit. Do not copy backup credentials or backup files into this repository or CI.

## Back up and monitor

1. In the managed PostgreSQL provider, enable encrypted daily backups or point-in-time recovery and retain at least 7 daily restore points. Record the provider, schedule, retention expiry, and backup timestamp in the operator's private change log.
2. Use the provider's authenticated dashboard/API to confirm the latest backup succeeded. The beta operator checks it daily; alert the operator and recovery custodian on a missed/failed backup. If it fails, do not treat the RPO as met: repair the schedule, take an on-demand backup, and verify the replacement before continuing a risky migration.
3. PostgreSQL backups do **not** contain UploadThing objects. Keep project files in the configured UploadThing account, restrict account access, and do not delete objects as part of database recovery. Record the UploadThing app/account and retention/access policy in the same private operator log. Before recovery, verify that the account and file objects remain available.
4. Retrieve a database backup only through the provider's authenticated restore/export workflow. Store any exported copy encrypted with access limited to the recovery operator, and remove temporary copies after the rehearsal.

## Restore rehearsal

Use a synthetic beta fixture in a separate PostgreSQL database/schema. Never restore over production during rehearsal.

1. Create an isolated target from the provider's restore/export function and record its generated endpoint privately. Set `DATABASE_URL` only in the one-off operator shell; never put it in a command transcript or CI variable.
2. Restore using the provider's documented restore mechanism. For a provider-supplied custom-format `pg_dump` file, use `pg_restore --exit-on-error --no-owner --dbname="$RESTORE_DATABASE_URL" backup.dump`; for a plain SQL export, use `psql "$RESTORE_DATABASE_URL" --set ON_ERROR_STOP=on --file=backup.sql`. Do not run these against the live database.
3. Record the backup timestamp and start/end times. Run `pnpm db:generate`, then inspect the restored schema with `pnpm exec prisma migrate status` using the isolated target URL.
4. Sign in with the fixture owner and verify workspace membership and project access, deliverable versions, invoice IDs and totals, and the stored UploadThing file references. Download a fixture file through the app and confirm it matches the expected file. A restored row is not proof that its remote object survived.
5. Record elapsed restore time and the interval between the last backup and the rehearsal point. That interval is the observed data-loss window. The operator signs and dates the result in the private log. Repeat at least quarterly and after changing database or file-storage providers.

## Deploy and recover

1. Take or confirm a recent database restore point and confirm storage objects remain available.
2. Deploy a candidate to an isolated/staging environment. Run `pnpm db:deploy` there and verify migration status before starting/routing the candidate app.
3. For production, apply the reviewed migration with `pnpm db:deploy` as a separate deployment step. If it fails, stop before routing traffic, inspect the provider's migration logs and database state, and fix forward. Do not start the candidate against a partially migrated schema.
4. Start the candidate only after migration success, then run authenticated sign-in, project, file download, and invoice PDF smoke checks before increasing traffic.
5. If application behavior fails after migration, route back to the previous app only when the new schema remains backward compatible and the previous app has been checked against it. Otherwise stop writes/traffic as appropriate, preserve the current database, and prepare a forward fix.
6. Restoring an older backup loses writes after its timestamp. Before any restore, stop writes, compare the restore point with current data, preserve any newer records that must survive, and obtain the operator's explicit incident decision. Never automatically overwrite a newer live database with an older backup.

## Destructive local database commands

`pnpm db:push`, `pnpm db:migrate`, `pnpm db:reset`, and `pnpm db:wipe` are local development commands. They require `DEV_DATABASE_URL` targeting local PostgreSQL database `handoff_dev` or `handoff_test`; they refuse remote hosts, production mode, alternate database names, and host overrides. They never fall back to inherited `DATABASE_URL`. Configure the same local development database in both variables for normal local app work, but use the separate guard variable for the destructive command target. `pnpm db:deploy` is the reviewed deployment command and must only run against the intended deployment target.

Workspace and project deletion are owner-only. Workspace deletion cascades through that workspace's clients, projects, members, and project data. Project deletion removes deliverables, requests, tasks, file metadata, access links, and activity. Invoice references restrict project deletion so invoices and line-item history cannot be removed by the project cascade. A client's deletion is restricted while projects refer to it. Confirmation dialogs provide Cancel; only the explicit destructive action submits the server action. Provider storage objects are separate and may require a separate, verified cleanup.
