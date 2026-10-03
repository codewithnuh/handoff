# Private deliverable file rollout

New deliverable uploads request the UploadThing `private` ACL and can only be downloaded through the project-authorized application route. The route issues a signed provider URL that expires after **60 seconds**. Authorization is checked on every request, so project access revocation takes effect before a new URL is issued.

Before deploying this change, enable **Allow Overriding ACL** in the UploadThing app settings. Run `pnpm files:make-private` with the production UploadThing token to change every existing provider object to private, including files that have no database record. The script paginates through the provider inventory and stops on an ACL failure. Verify raw `https://utfs.io/f/<key>` access is denied before routing users to the new application download endpoint. Existing ambiguous legacy file records without a single project owner are denied by the application until reconciled.

Run `pnpm files:cleanup` daily. It removes expired failed uploads and provider objects that were uploaded but never attached after 24 hours. Failed deletions stay eligible for the next run.

Before beta, on a staging UploadThing app with the ACL override enabled, record the deployment SHA and verify all of the following:

1. A signed-out upload and an observer or read-only workspace upload fail before an upload is allocated.
2. A permitted contributor uploads an allowed file; the project portal and dashboard download endpoints return a signed URL.
3. The provider's raw public URL is denied, and the signed URL expires after its one minute TTL.
4. A user without project access receives 404 from the application download endpoint.

Record the staging app, SHA, date, and observed results in the release notes. Do not announce private storage until this migration and smoke test have passed.
