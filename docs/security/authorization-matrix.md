# Authorization matrix

This matrix maps exported server entry points to the identity and scope they must enforce. Server actions are callable by direct POST, so a hidden control or page redirect does not count as authorization. The integration tests in `tests/integration/authorization-matrix.integration.test.ts` exercise representative direct calls and route handlers against PostgreSQL; related focused tests live beside the access helpers and actions.

## Server actions

| Entry points | Identity and scope | Required capability or policy |
| --- | --- | --- |
| `register`, `login`, `logout`, `requestPasswordReset`, `resetPassword`, `sendVerificationOtp`, `verifyEmailOtp` | Public auth request. Better Auth verifies credentials, OTPs, tokens, and session cookies. | Public by design; validate payloads and rely on Better Auth for credential and token checks. |
| `clientLogout` | Current portal cookie. | Logout only; delete the matching server session and clear the cookie. |
| `getSession` | Authenticated user when present; no workspace data. | Public status lookup; return only the caller's own session. |
| `changePassword`, `updateProfile` | Signed-in user ID. | Own account only; Better Auth binds the update to request headers. |
| `getCurrentWorkspace`, `listWorkspaces`, `createWorkspace`, `switchWorkspace` | Signed-in user ID. Workspace IDs must be owned or actively joined. | Create under the caller; switch only to a workspace where the caller is owner or member. |
| `updateWorkspace`, `deleteWorkspace` | Active workspace. | Owner/admin may rename; owner alone may delete. |
| `listClients`, `getClient`, `listProjects`, `getProject` | Active workspace, narrowed to project assignments for non-admin members. | Reads only; project reads require project access. |
| `createClient`, `updateClient`, `deleteClient` | Active workspace. | `MANAGE_CLIENTS`; all client IDs must belong to the active workspace. |
| `createProject` | Active workspace. | `CREATE_PROJECTS`; client ID must belong to that workspace. |
| `updateProject`, `updateProjectStatus`, `updateProjectProgress` | Resolved project in the active workspace. | Project role must allow edits; replacement client IDs must remain in the same workspace. |
| `deleteProject` | Resolved project in the active workspace. | Workspace owner/admin only. |
| `listTeamMembers` | Active workspace. | Read only members of that workspace. |
| `inviteTeammate`, `listPendingTeamInvites`, `listTeamInvites`, `revokeTeamInvite`, `updateTeamMemberRole`, `updateMemberPermissions`, `removeTeamMember` | Active workspace. | `MANAGE_MEMBERS`; owner identity is immutable and cannot be removed. |
| `listProjectMembers` | Resolved project. | Read only assigned project members. |
| `updateProjectMemberRole`, `removeProjectMember` | Resolved project. | Owner/admin/project lead; target must be in the workspace; owner is not removable. |
| `validateTeamInvite`, `acceptTeamInvite` | Public token validation or token plus authenticated invitee identity. | Token must be valid, unexpired, unconsumed, and bound to the expected invitee. Acceptance only grants project IDs still in the invited workspace. |
| `createTask`, `reorderTasks` | Resolved project. | Owner/admin/lead/contributor; observers are read-only. Every task in a reorder must belong to the submitted project. |
| `updateTask`, `deleteTask` | Task ID is resolved first, then its parent project is authorized. | Owner/admin/lead/contributor; observers are read-only. |
| `listDeliverables`, `getDeliverable`, `createDeliverable`, `updateDeliverable`, `deleteDeliverable`, `addDeliverableVersion` | Resolved project or deliverable's parent project. | Project permissions and deliverable status rules; file/version IDs must be related to the same deliverable. |
| `addComment` | Target deliverable/request is resolved first, then its parent project. | Signed-in project member; workspace must still be writable. |
| `updateRequestStatus` | Request ID is resolved first, then its parent project. | Project role must allow request updates. |
| `createInvoice`, `updateInvoice`, `deleteInvoice`, `sendInvoice`, `markInvoicePaid`, `cancelInvoice`, `addLineItem`, `removeLineItem`, `convertDeliverablesToLineItems` | Invoice/project IDs are resolved and bound to the active workspace. | Owner/admin/lead/contributor with deliverable management capability; linked deliverables must belong to the same project. |
| `inviteClient`, `revokeClientAccess`, `resendInvitation` | Resolved project. | Project lead, owner, or admin; access is explicit per project and email. |
| `clientApproveDeliverable`, `clientRequestChanges`, `clientAddComment`, `clientCreateRequest` | Signed portal session, then explicit `ProjectAccess` for the target's parent project. | DRAFT deliverables are not actionable; review state and optimistic version must match. |
| `deliverableFile` upload route | Better Auth session, active workspace, project membership, and writable plan are checked before creating a one-hour upload intent. | Owners, admins, leads, and contributors; observers, outsiders, signed-out users, and read-only workspaces are denied before provider allocation. Verified provider completion creates the only file record. |
| `addDeliverableVersion` | Target deliverable is resolved and its project is authorized. | A completed upload intent must match the same project and uploader and can be consumed once. |
| `GET /api/files/[id]/download` | File's project is resolved before issuing a signed URL. | Dashboard project access or explicit portal project access; every redirect has a 60-second TTL and no-store headers. |
| `listAllLinks` | Active workspace. | `MANAGE_MEMBERS`; return only invitation links from this workspace. |
| `revokeLink`, `bulkRevokeLinks` | Active workspace. | Owner/admin only; client invitations must belong to this workspace. |

## Queries and pages

| Entry points | Identity and scope | Required capability or policy |
| --- | --- | --- |
| `getContext`, `getWorkspaceId` | Signed-in user and active workspace. | Resolve the workspace from current owner/member rows on every request. |
| `projectScope` | Existing workspace context. | Restrict project reads to assignments for non-admin members. |
| `getDashboardOverview`, `getProjectListData`, `getWorkspaceUsage`, `getRecentWorkspaceActivity` | Signed-in user and active workspace. | Workspace scoped; project data narrowed to assignments where applicable. |
| `getProjectTasks`, `getProjectDetailForViewer` | Resolved project. | Require workspace/project access; return null on denied or missing project. |
| `getPortalClients`, `getPortalPageData`, `getManageableProjects` | Signed-in user and active workspace. | Portal client/project management data stays inside that workspace and respects role permissions. |
| `getPortalHomeProjects` | Portal email. | Return only projects with an explicit matching `ProjectAccess` row. |
| `getPortalProjectDetail` | Portal email plus project ID. | Require explicit per-project access; omit DRAFT deliverables and invoices outside SENT, PAID, and OVERDUE. |
| `/dashboard/**` pages | Signed-in workspace session through dashboard layout; sensitive pages add permission guards. | Workspace and page capability checks apply on server render. |
| `/portal/(client)/**` pages | Signed portal session through the client portal layout; project detail checks the requested project. | Explicit per-project access; no client data by email alone. |
| `/portal/expired` | Public expired-session information page. | No private client or project data. |

## HTTP routes

| Route | Identity and scope | Required capability or policy |
| --- | --- | --- |
| `/api/files/[id]/download` | Signed portal session, then file version's deliverable project. | Matching explicit `ProjectAccess`; inaccessible and missing files return the same 404 response. |
| `/api/invoices/[id]/pdf` | Signed-in user or signed portal session, then invoice's project. | User must resolve project access in the active workspace; clients need explicit `ProjectAccess`. Inaccessible and missing invoices return the same 404 response. |
| `/api/portal/accept` | Public one-time invitation token. | Token must be valid and unconsumed; grant access only to the invitation's project. |
| `/api/auth/[...all]` | Better Auth request handling. | Provider validates credentials, origin, session, and token for each endpoint. |
| `/api/uploadthing` | UploadThing request signature and configured upload router. | Provider validates callback/request signature; app upload metadata actions still require a workspace session. |

There is no `proxy.ts` in the current repository. Authorization lives in the shared access helpers and is repeated at each action, query, page, and route boundary that reads or mutates protected data.

## Portal visibility policy

Clients can see submitted deliverables and invoices with status SENT, PAID, or OVERDUE. DRAFT deliverables and draft/unsent invoices stay internal. `lib/queries/portal-project-detail.test.ts` pins these filters and verifies the query stops before reading detail when project access is absent.
