# Context — Handoff domain glossary

This file names the **domain**. Architecture vocabulary (module, interface, depth, seam, adapter, leverage, locality) is not here — it belongs to the design skill and is used exactly as written there. When a code identifier and a term here disagree, the term here wins.

## Core concepts

| Term | Meaning | Primary code home |
| --- | --- | --- |
| **Workspace** | The tenant. Owns clients, projects, team invitations. A user has one *active* workspace at a time and may own or be a member of several. | `lib/actions/workspace.ts` |
| **Workspace access** | The caller's standing in the active workspace: owner, admin (`ADMIN`) or member (`MEMBER`), plus granular `WorkspacePermission[]`. Owners have implicit full access. | `lib/access/workspace.ts` |
| **Project** | Work in progress for one Client. Has status, progress, dates, and a project team. | `lib/actions/project.ts`, `lib/queries/project-detail.ts` |
| **Project access** | Need-to-know scoping on a single Project via `ProjectMember`. Effective roles: `LEAD` > `CONTRIBUTOR` > `OBSERVER`; workspace owner/admin bypasses membership and is `OWNER`. Expressed as capabilities (`canEditProject`, `canManageDeliverables`, `canSubmitForReview`, `canUpdateRequests`, `canDeleteProject`). | `lib/access/project.ts` |
| **Client** | The customer an invoice is addressed to and a Project belongs to. Workspace-wide directory, visibility still filtered by project membership. | `lib/actions/client.ts` |
| **Deliverable** | A unit of work handed to the client, with versions and an optimistic-lock `version` counter. States flow `DRAFT` → `IN_REVIEW` → accepted / changes requested. | `lib/actions/deliverable.ts` |
| **Invoice** | Money against approved deliverables. Has line items, tax, and statuses `DRAFT` / `SENT` / `PAID` / `OVERDUE` / `CANCELLED`. Numbers are allocated per project as `INV-NNN`. | `lib/actions/invoice.ts`, `lib/invoice/money.ts` |
| **Task** | Small item inside a Project with an ordered `position` and `TaskStatus`. | `lib/actions/task.ts` |
| **Request** | A client-initiated change request on a Project. | `lib/actions/request.ts` |
| **Invitation** | Two distinct objects that both end in an acceptance link: a **team invitation** (joins a Workspace) and a **client invitation** (grants portal access). Both carry a 7-day TTL and an `ACTIVE` / `EXPIRED` / `ACCEPTED` / `PENDING` status. | `lib/actions/team.ts`, `lib/actions/invitation.ts`, `lib/actions/links.ts` |
| **Portal access** | A client's session in the client portal: separate cookie, separate HMAC, checked per project ("can this client see this project?"). One implementation, used by portal actions, portal pages, the download route and the project queries alike. | `lib/access/portal.ts` (session primitives in `lib/portal.ts`) |
| **Handoff link** | The URL a client follows to reach the portal (`/api/portal/accept?token=…`). Same object as a client invitation, viewed by the sender. | `lib/actions/links.ts` |
| **Workspace read-only mode** | A downgraded subscription past its grace period locks writes. Subscription belongs to the workspace **owner**, not the workspace. | `lib/services/plan-limits.ts` |
| **Activity** | Append-only timeline row for a Project. Never allowed to fail the primary mutation. | `lib/actions/activity.ts` |

## Named seams

Decided during the architecture review of 25 September 2026. Future reviews should not re-propose these; they are the target shape.

- **Action pipeline** — `defineAction({ schema, guard, check, errors, revalidate, run })` in `lib/actions/define.ts`. Validation, guard, plan limits, activity and revalidation are bands of one pipeline, not 55 hand-copied blocks. Every action returns `ActionResponseType<T>`; there is one envelope, never a second.
- **Access module** (`lib/access/`, candidate 2) — workspace access, project access and portal access behind one interface with three adapters: better-auth session, portal token, injected identity in tests.
- **ProjectDetail** (candidate 3) — one query shape, two adapters: the *dashboard viewer* and the *portal client*. Money/Decimal mapping is written once.
- **Invoice numbering** (candidate 6) — allocation and recalculation live inside one interface so the transaction cannot be opted out of. `INV-NNN` is unique per project under concurrency.
- **Presentational vocabulary** (candidate 7) — pure code in `lib/presentational/` (`format.ts` dates/currency, `status.ts` label+variant maps), JSX in `components/presentational/` (`EmptyState`, `ErrorPanel`, route skeletons). The five `app/dashboard/**/error.tsx` files and the `DashboardError` boundary render through `ErrorPanel`; route skeletons are reached through `loading.tsx` files.

## Vocabulary drift to avoid

- The dashboard and the portal show the **same** status enums. One label map, not six. Two wordings are deliberate and encoded in `lib/presentational/status.ts`: the portal says "Pending" where the dashboard says "Sent" (`INVOICE_STATUS_CONFIG_PORTAL`), and team invites say "Accepted ✓" via `teamInviteStatus()`.
- "Client" means the customer. The signed-in person is the *user*; a client in the portal is not a user until they accept an invitation.
- A **session** is either a better-auth dashboard session or a portal session — say which one.
