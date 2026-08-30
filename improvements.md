# Improvements & Security Requirements

## Purpose

This document defines the required improvements to the platform's:

* Authentication
* Client portal access
* Magic-link authentication
* Team invitations
* Account creation
* Workspace and project permissions
* Workspace membership
* Workspace switching
* Authorization
* Sessions
* Refresh tokens
* JWT / JOSE tokens
* Permission-based UI
* Security boundaries

The goal is to make the platform secure, predictable, and resistant to authorization bypasses while keeping the user experience simple.

Agents should treat this document as a **product, security, and behavior specification**.

Do not assume that hiding UI elements is sufficient security. The backend must independently enforce every security boundary.

The implementation details should follow the existing architecture rather than introducing unnecessary architectural changes.

---

# 1. Core Product Hierarchy

The platform follows this model:

```text
User Account
    │
    ├── Workspace A
    │      │
    │      ├── Projects
    │      │      ├── Clients
    │      │      └── Team Members
    │      │
    │      └── Workspace Administration
    │
    └── Workspace B
           │
           ├── Projects
           │      ├── Clients
           │      └── Team Members
           │
           └── Workspace Administration
```

A single user account may belong to multiple workspaces.

The user's role and permissions can be different in each workspace.

For example:

```text
User
│
├── My Workspace
│     └── Owner
│
└── Client Agency Workspace
      └── Contributor
```

This must be treated as one user account with multiple workspace memberships.

It must **not** create separate accounts, separate identities, or separate dashboard applications.

There are two fundamentally different types of project access:

### Clients

Clients are invited to a **specific project** and access that project through the client portal.

### Team Members

Team members are internal workspace users invited by an admin and assigned workspace/project access and permissions.

These concepts must remain separate.

A client should never automatically become a team member.

A team member should never automatically receive client-portal privileges.

---

# 2. Workspace Membership and Multiple Workspaces

A user account may belong to multiple workspaces.

For example:

```text
User Account

├── Workspace A
│     └── Owner
│
├── Workspace B
│     └── Contributor
│
└── Workspace C
      └── Viewer
```

The user should be able to access the workspaces they are authorized to access.

The current workspace context determines what the user can see and do.

The platform should make the current workspace clear to the user.

Conceptually:

```text
Current Workspace
       ↓
Current Membership
       ↓
Workspace Permissions
       ↓
Project Access
       ↓
Project Permissions
       ↓
Available UI + Actions
```

A user's membership in Workspace B must not affect their ownership permissions in Workspace A.

For example:

```text
Workspace A → Owner
Workspace B → Contributor
```

Being a Contributor in Workspace B must not downgrade or restrict the user's Owner capabilities in Workspace A.

Likewise, being an Owner in Workspace A must not automatically grant Owner capabilities in Workspace B.

---

# 3. One Dashboard, Permission-Driven Experience

The platform should use the **same primary dashboard/application experience** for users regardless of whether they are:

* Workspace Owner
* Workspace Admin
* Project Manager
* Project Lead
* Contributor
* Viewer
* Other supported membership types

Do **not** create separate dashboard products such as:

```text
OwnerDashboard
TeamMemberDashboard
ContributorDashboard
ViewerDashboard
```

Instead, use the existing dashboard and make its available functionality depend on the user's current workspace membership and permissions.

Conceptually:

```text
Same Dashboard
       │
       ↓
Current Workspace
       │
       ↓
Current Membership
       │
       ↓
Current Permissions
       │
       ├── Navigation
       ├── Visible sections
       ├── Available actions
       ├── Project visibility
       └── Administrative controls
```

For example, an Owner may see:

```text
Dashboard

Overview
Projects
Clients
Deliverables
Activity
Team
Invitations
Workspace Settings
Billing
```

A Contributor in another workspace may see:

```text
Dashboard

Overview
Projects
Deliverables
Activity
```

The underlying dashboard remains the same.

The difference is what the user is authorized to see and use.

The goal is **permission-driven behavior**, not duplicate dashboards.

---

# 4. Workspace Switching

If a user belongs to multiple workspaces, the application should provide a clear way to select or switch the current workspace.

For example:

```text
Workspace ▼

My Company
Owner

Agency Workspace
Contributor

Client Workspace
Viewer
```

When the user switches workspaces:

```text
Current Workspace changes
        ↓
Current membership changes
        ↓
Permissions are recalculated
        ↓
Projects/navigation/actions update
```

The application must not continue displaying permissions or project data from the previous workspace after switching.

The server must also treat the selected workspace as an authorization boundary.

Changing the workspace context must never allow the user to access a workspace they do not belong to.

---

# 5. Permission Scope Must Be Explicit

The authorization system must clearly distinguish between:

### Account / Platform-level permissions

What the user can do across the platform.

### Workspace-level permissions

What the user can do within a workspace.

Examples:

* Manage workspace
* Manage workspace members
* Configure workspace settings
* Manage workspace-level resources
* Manage billing where applicable
* Create workspace resources where applicable

### Project-level permissions

What the user can do within a specific project.

Examples:

* View project
* Edit project
* Manage project content
* Manage deliverables
* Submit work
* Other project-specific actions

### Client portal access

What a client can view or perform within the project they were invited to.

A permission at one scope must never accidentally become a permission at another scope.

For example:

```text
Project Contributor
        ≠
Workspace Administrator
```

and:

```text
Project access
        ≠
Access to every project
```

and:

```text
Client access
        ≠
Team member access
```

---

# 6. Client Access Is Project-Specific

A client is invited to a specific project.

For example:

```text
Workspace

├── Project A
├── Project B
└── Project C

Client

└── Project B
```

The client should only be able to access Project B.

They must not be able to:

* See Project A.
* See Project C.
* Discover other projects.
* Access another project by changing an ID in the URL.
* Access another project by modifying a request.
* Enumerate projects.
* Access workspace administration.
* Access internal team-management functionality.
* Access internal workspace information unless explicitly intended.

This restriction must exist at the authorization/data-access level.

The UI alone must never be responsible for protecting project isolation.

---

# 7. Client Portal Visibility

The client portal should expose only what the client has explicitly been granted access to.

The client should only see:

* Their authorized project.
* Information belonging to that project that is intended for the client.
* Client-facing actions they are authorized to perform.

The client should not receive internal information simply because the frontend happens to hide it.

If the client is not authorized to access information, that information should not be returned to the client in the first place.

This includes:

* Other projects
* Internal workspace details
* Internal team information
* Administrative controls
* Internal-only metadata
* Unauthorized deliverables/resources
* Unauthorized project actions

The client portal should be intentionally minimal and client-facing.

---

# 8. Team Member Invitations vs. User Accounts

The current team invitation flow effectively combines:

```text
Invitation
+
Account creation
+
Password creation
+
Permission assignment
```

This creates an important identity problem.

An invitation should not effectively become the person's account.

The invitation should represent:

> "This email address has been invited to join this workspace/team with these permissions."

It should not mean:

> "This email address has permanently become this role."

---

# 9. Team Invitation and Account Creation Model

Team invitations and platform accounts must be treated as separate concepts.

The desired lifecycle is:

```text
Admin invites email
        ↓
Invitation created
        ↓
Invitation sent
        ↓
User opens invitation
        ↓
Existing account?
    /       \
  YES       NO
   ↓         ↓
Authenticate  Create normal account
   ↓         ↓
   └────┬────┘
        ↓
Accept invitation
        ↓
Membership established
        ↓
Permissions applied
```

The invitation establishes the user's membership and permissions.

The resulting account remains a normal platform account.

The invitation must not create a special class of account.

---

# 10. Existing Account Handling

If the invited email already belongs to an account:

* Do not create another account.
* The user should authenticate with their existing account.
* The invitation should be attached to that account.
* The appropriate workspace/project membership should be established.
* The invited permissions should be applied only within their intended scope.

The invitation must not modify the user's global identity or unexpectedly change their permissions elsewhere.

For example:

```text
Existing Account

Workspace A → Owner

Invitation

Workspace B → Contributor

Result

Workspace A → Owner
Workspace B → Contributor
```

Both memberships belong to the same account.

---

# 11. New Account Handling

If the invited email does not yet have an account:

* Allow the user to create a normal platform account.
* The account must correspond to the invited email.
* The invitation should be accepted after successful authentication/account creation.
* The invited workspace/project membership should then be established.
* The invitation's permissions should be applied to the appropriate scope.

The new account must not become permanently restricted because it originated from an invitation.

The account should be capable of participating in other workspaces according to the normal platform rules.

---

# 12. Important Account Permission Scenario

A person can legitimately have different roles in different contexts.

For example:

```text
User Account

├── Workspace A
│     └── Owner
│
├── Workspace B
│     ├── Contributor
│     └── Project A → Contributor
│
└── Workspace C
      └── Viewer
```

Being invited as a Contributor to one workspace or project must not prevent the same account from owning another workspace where the platform rules allow it.

Project membership is not the user's permanent global role.

Workspace membership is also contextual.

The user's effective permissions must always be evaluated against the current workspace/project context.

---

# 13. Team Member Project Assignment

Team member access to projects must be explicit where the product requires project-level assignment.

Example:

```text
Workspace

├── Project A → Team member has access
├── Project B → No access
├── Project C → Team member has access
└── Project D → No access
```

The team member should only see:

```text
Project A
Project C
```

They must not be able to access Project B or D through:

* Navigation
* URLs
* Direct requests
* Manually modified IDs
* Client-side state manipulation
* API/server-action calls

Project assignment must be enforced server-side.

---

# 14. Permission-Based Dashboard and UI

The existing application dashboard should dynamically reflect the user's current permissions.

Do not create duplicate dashboards for each role.

Instead:

```text
Current Workspace
        ↓
Current Membership
        ↓
Current Permissions
        ↓
Same Dashboard
        ↓
Authorized functionality
```

For example:

```text
Dashboard
│
├── Overview
├── Projects
├── Clients
├── Deliverables
├── Activity
├── Team
├── Invitations
├── Workspace Settings
└── Billing
```

Each section/action should only be available when appropriate.

If the user does not have permission to manage members:

```text
Team
```

should not be presented as an available administrative area.

If the user cannot access a project, that project should not appear in the project list.

If the user can view but not edit a resource, the interface should communicate that appropriately.

The exact UI behavior should follow the existing design system, but permissions must drive availability.

---

# 15. UI Restrictions Are Not Security

Hiding or disabling an action is only a UX improvement.

It is not authorization.

For example:

```text
Button hidden
```

does not mean:

```text
Action secured
```

A user may still attempt to perform the action manually.

Every sensitive operation must perform its own server-side authorization check.

The user must not be able to bypass permissions by:

* Editing browser requests.
* Calling server actions directly.
* Calling APIs directly.
* Modifying URLs.
* Changing resource IDs.
* Modifying request payloads.
* Re-enabling disabled controls.
* Manipulating client-side state.
* Using browser developer tools.
* Calling endpoints that are not exposed in the UI.

The server must always make the final authorization decision.

---

# 16. Double-Layer Authorization

Sensitive functionality should have two layers.

### Layer 1 — UI authorization

The UI determines what the user should see and interact with.

### Layer 2 — Server authorization

The server independently determines whether the requested operation is actually allowed.

Conceptually:

```text
User
  ↓
UI checks permissions
  ↓
Authorized option displayed
  ↓
Request
  ↓
Server checks identity
  ↓
Server checks current workspace
  ↓
Server checks workspace membership
  ↓
Server checks project access
  ↓
Server checks required permission
  ↓
Allow / Reject
```

The server must never trust a permission decision made by the browser.

---

# 17. Authorization Must Use Current Permissions

Authorization must be based on the user's current membership and permissions.

Do not rely on permissions previously loaded into the browser.

For example:

```text
Before:

Team member → Project A → Editor

Admin changes:

Project A → Viewer

After:

Team member → Project A → Viewer
```

The old Editor capability must immediately stop working for future authorized operations.

Similarly:

```text
Admin removes Project A access
        ↓
User can no longer access Project A
```

The user should not retain access simply because their browser has stale permission information.

---

# 18. Workspace Creation Restriction

A team member with limited project permissions must not automatically be able to create a new workspace.

For example:

```text
Project Contributor
        ↓
Can perform allowed project actions
        ↓
Cannot create workspace
```

unless workspace creation is explicitly authorized for that account.

Workspace creation is a separate capability from project contribution.

This restriction must be enforced server-side.

It must not depend on hiding the "Create Workspace" button.

---

# 19. Client and Team Member Isolation

Clients and internal team members represent different access models.

A client:

* Has access to explicitly assigned project(s).
* Uses the client portal.
* Should only see client-facing project information.
* Should not gain workspace/team administration.

A team member:

* Belongs to a workspace according to their membership.
* Has assigned project access and permissions.
* May have workspace-level capabilities depending on their permissions.
* Uses the normal application dashboard.

Neither type should accidentally inherit the other's capabilities.

---

# 20. Client Portal Magic-Link Authentication

Client portal authentication should use magic links as an **authentication entry point**, not as the client's permanent session.

The authenticated session should be the mechanism that maintains access after authentication.

---

# 21. First Magic-Link Visit

When the client opens a valid, unused magic link:

```text
Client receives magic link
        ↓
Opens link
        ↓
Magic link validated
        ↓
Client authenticated
        ↓
Portal session established
        ↓
Magic link consumed
        ↓
Client enters portal
```

The magic-link credential should not remain a permanent authentication credential.

---

# 22. Returning to the Same Magic Link

The client should not have to request a new email every time they return to the portal.

For example:

```text
Morning

Client opens magic link
        ↓
Authenticated
        ↓
Portal

Noon

Client opens same original link
        ↓
Active portal session exists
        ↓
Continue to portal
```

The original link can therefore function as a convenient entry URL while the client already has a valid authenticated session.

The consumed magic-link credential must not be treated as a reusable authentication credential.

The active session is what grants access.

---

# 23. Expired Client Session

If the client returns later and their authenticated session has expired:

```text
Client opens original link
        ↓
No active session
        ↓
Magic link already consumed
        ↓
Do not authenticate using old link
        ↓
Show session-expired state
        ↓
Request new magic link
        ↓
Send new link to verified client email
```

The experience should be simple.

The client should not need to manually remember or type the portal URL.

---

# 24. Magic-Link Security

Magic links are sensitive authentication credentials.

They must:

* Be cryptographically strong and unpredictable.
* Have a defined expiration.
* Be single-use for authentication.
* Be revocable.
* Be tied to the intended client/account.
* Not authenticate a different user.
* Not become permanent sessions.
* Not be reusable after consumption to establish a new session.
* Not unnecessarily remain visible in the browser after authentication.
* Not unnecessarily appear in application logs or telemetry.

A used magic link may still be recognized as an entry URL when an active session exists, but it must never regain its original authentication power after consumption.

---

# 25. Session Security

Review the entire client authentication/session lifecycle.

The system should clearly distinguish:

```text
Magic-link credential
        ↓
Authenticated session
        ↓
Refresh mechanism where applicable
        ↓
Authenticated portal access
```

Sessions must have:

* Intentional expiration.
* Proper revocation behavior.
* Appropriate secure storage.
* Correct logout behavior.
* Protection against unauthorized reuse.
* Correct behavior when permissions or access are revoked.

Authentication state must not depend on insecure client-controlled state.

---

# 26. Refresh Tokens, JWT and JOSE Review

Review the entire token system, including:

* Session credentials.
* Session cookies.
* Magic links.
* Invitation tokens.
* Refresh tokens.
* Access tokens.
* JWTs.
* JOSE-based credentials.
* Client portal authentication credentials.

Every credential must have a clearly defined purpose and lifecycle.

Conceptually:

```text
Invitation credential

        ≠

Magic-link credential

        ≠

Authenticated session

        ≠

Refresh credential

        ≠

Access credential
```

A credential created for one purpose must not accidentally be accepted by another authentication flow.

Review and harden:

* Expiration.
* Revocation.
* Signing/verification.
* Credential storage.
* Lifecycle.
* Invalidation.
* Production secret configuration.
* Token purpose separation.
* Cross-flow token acceptance.

Sensitive credentials should not be unnecessarily exposed to browser JavaScript.

---

# 27. Direct Resource Access Protection

Every protected resource must enforce authorization regardless of how it is accessed.

For example, if a client has:

```text
Project A
```

then:

```text
/project/A
```

may be accessible.

Changing the URL to:

```text
/project/B
```

must not expose Project B.

Likewise, manually changing an ID in a request must not grant access.

Authorization should conceptually consider:

```text
Authenticated identity

        +

Current workspace context where applicable

        +

Workspace membership where applicable

        +

Project access where applicable

        +

Required permission

        +

Resource ownership/scope where applicable
```

The exact checks depend on the operation, but authorization must always be performed at the appropriate scope.

---

# 28. Sensitive Actions Must Be Protected

Review all sensitive actions, including:

* Workspace creation.
* Workspace deletion.
* Workspace settings.
* Workspace member management.
* Project creation.
* Project deletion.
* Project settings.
* Project member management.
* Client invitations.
* Team invitations.
* Invitation revocation.
* Deliverable operations.
* Project content changes.
* Client portal actions.
* Authentication operations.
* Account operations.
* Workspace switching/context changes where relevant.

Each operation must verify the current user's authorization before performing the mutation.

---

# 29. Permission Changes Must Propagate Correctly

When an admin changes a user's permissions, the new authorization state must become effective.

Examples:

```text
Editor → Viewer
```

means the user can no longer perform Editor actions.

And:

```text
Project access removed
```

means the user can no longer access that project.

And:

```text
Workspace membership removed
```

means the user can no longer perform workspace operations within that workspace.

The browser must not be able to retain elevated access simply because it previously loaded an old permission set.

The same principle applies when switching between workspaces.

The permissions displayed in Workspace A must never accidentally be reused when the user switches to Workspace B.

---

# 30. Invitation Lifecycle

Invitations should have a clear lifecycle:

```text
Created
   ↓
Sent
   ↓
Pending
   ↓
Accepted
```

or:

```text
Pending
   ↓
Expired
```

or:

```text
Pending
   ↓
Revoked
```

An invitation that is:

* Accepted
* Expired
* Revoked

must not unexpectedly become usable again.

---

# 31. Authentication and Authorization Separation

Authentication answers:

> Who is this user?

Authorization answers:

> What is this user allowed to do?

These concerns must remain separate.

For example:

```text
Authenticated user
        ≠
Workspace administrator
```

and:

```text
Authenticated client
        ≠
Access to every project
```

and:

```text
Authenticated team member
        ≠
Permission to perform every team/workspace action
```

Being successfully authenticated must never automatically imply broad authorization.

---

# 32. Security Testing and Regression Testing

The changes must include regression testing against both normal behavior and deliberate bypass attempts.

## Client magic links

Test:

* First-time client opens a valid link.
* Client successfully enters the portal.
* Client opens the same link again while the session is active.
* Client is taken back into the portal without requesting another email.
* Client opens the same link after the session expires.
* Expired session results in a new-link flow.
* Expired magic link is rejected.
* Revoked magic link is rejected.
* Used magic link cannot establish a new session.
* Another person cannot use a client's magic link to authenticate.
* Multiple attempts to consume the same magic link behave safely.
* New authentication links behave correctly.
* Old credentials cannot bypass revocation/expiration.

## Team invitations

Test:

* Existing account accepts invitation.
* Existing account does not receive a duplicate account.
* New user creates an account through invitation.
* New account becomes a normal platform account.
* Invitation permissions are applied to the intended scope.
* Invitation cannot grant unrelated workspace/project access.
* Wrong account cannot claim an invitation.
* Expired invitation is rejected.
* Revoked invitation is rejected.
* Accepted invitation cannot be reused.
* Multiple invitations behave predictably.
* A user who already owns a workspace can accept an invitation to another workspace without losing or changing their existing ownership.

## Workspace membership

Test:

* User can belong to multiple workspaces.
* User can have different roles in different workspaces.
* Owner permissions in Workspace A do not leak into Workspace B.
* Contributor permissions in Workspace B do not restrict Owner capabilities in Workspace A.
* Switching workspace updates the visible projects.
* Switching workspace updates available actions.
* Switching workspace does not expose data from the previous workspace.
* User cannot switch to a workspace they do not belong to.
* Removed workspace membership prevents future access.

## Dashboard/UI permissions

Test:

* Same dashboard is used for different membership types.
* Owner sees owner-authorized functionality.
* Contributor sees contributor-authorized functionality.
* Viewer sees viewer-authorized functionality.
* Unauthorized navigation items are not presented as available.
* Unauthorized project entries are not shown.
* Disabled UI controls cannot be bypassed.
* Hidden UI actions cannot be called directly.
* UI permission state does not become the security boundary.

## Client project isolation

Test:

* Client can access assigned project.
* Client cannot access another project.
* Client cannot access another project through a modified URL.
* Client cannot access another project through a modified request.
* Client cannot enumerate unauthorized projects.
* Client cannot access workspace administration.
* Client cannot access internal team functionality.
* Unauthorized project information is not returned to the browser.

## Team member authorization

Test:

* Team member sees only assigned projects.
* Team member cannot access unassigned projects.
* Team member can perform permitted actions.
* Team member cannot perform unauthorized actions.
* Direct server/API requests are rejected when unauthorized.
* Project Contributor cannot create a workspace unless explicitly authorized.
* Project permissions do not become workspace permissions.
* Removing a permission immediately prevents future unauthorized operations.
* Removing project access prevents project access.
* Removing workspace membership prevents workspace access.

## Token/session security

Test:

* Sessions expire correctly.
* Revoked sessions are rejected.
* Logout behaves correctly.
* Refresh behavior is correct.
* Expired credentials cannot be reused.
* Revoked credentials cannot be reused.
* Magic-link credentials cannot be used as invitation credentials.
* Invitation credentials cannot be used as authentication credentials.
* Tokens cannot be used across unrelated authentication flows.
* Sensitive authentication credentials are not unnecessarily exposed.

---

# 33. Expected End State

The final system should conceptually behave like this:

```text
                         USER ACCOUNT
                              │
                 ┌────────────┴────────────┐
                 │                         │
           Authentication            Account-level access
                 │
                 ▼
          Workspace Memberships
                 │
       ┌─────────┼─────────┐
       │         │         │
 Workspace A  Workspace B  Workspace C
       │         │         │
    Owner    Contributor   Viewer
       │         │         │
       ▼         ▼         ▼
    Same Dashboard / Application
       │
       ▼
 Current Workspace Context
       │
       ▼
 Current Membership
       │
       ▼
 Current Permissions
       │
       ├── Authorized navigation
       ├── Authorized projects
       ├── Authorized actions
       └── Authorized administration
```

There should be **one primary dashboard experience**, not separate dashboards for Owners and Team Members.

The dashboard adapts according to the current workspace and permissions.

---

# 34. Client Access Model

Client access should remain separate from the internal workspace dashboard:

```text
WORKSPACE
│
├── Project A
├── Project B
└── Project C
      │
      └── Client
            └── Project C only
```

The client receives access to the client portal for the explicitly assigned project.

The client should not become an internal workspace user merely because they have project access.

---

# 35. Client Authentication Model

```text
Magic Link
    │
    │ one-time authentication
    ▼
Authenticated Session
    │
    ▼
Client Portal
    │
    ├── Active session
    │       ↓
    │   Same entry URL → Portal
    │
    └── Expired session
            ↓
       Request new link
            ↓
       Email client
```

---

# 36. Team Invitation Model

```text
Admin
  ↓
Invite email
  ↓
Invitation
  ↓
Existing account OR new account
  ↓
Authentication
  ↓
Invitation accepted
  ↓
Workspace membership
  ↓
Project assignment where applicable
  ↓
Configured permissions
  ↓
Normal application dashboard
```

The invited user should not receive a special invitation-specific dashboard.

After acceptance, they use the normal application dashboard with functionality determined by their current membership and permissions.

---

# 37. Core Security Principle

The platform should follow this principle:

> **Show users only what they are allowed to use, but never trust the UI to enforce security.**

The final security model must combine:

```text
Good UX
+
Correct authentication
+
Secure sessions
+
Secure token lifecycle
+
Correct account separation
+
Correct workspace scoping
+
Correct project scoping
+
Server-side authorization
+
Permission-aware UI
+
Direct-access protection
```

The objective is not simply to hide buttons.

The objective is to ensure that an unauthorized user **cannot perform the action even when deliberately attempting to bypass the interface.**

---

# 38. Final Acceptance Criteria

The implementation should not be considered complete until all of the following are true.

### Client access

* Clients can only access explicitly assigned projects.
* Clients cannot discover or access other projects.
* Direct URL manipulation cannot bypass project isolation.
* Direct request manipulation cannot bypass project isolation.
* Clients cannot access internal workspace/team functionality.
* Clients only receive information they are authorized to see.

### Team invitations

* Invitations are separate from user accounts.
* Existing users do not receive duplicate accounts.
* New users can create normal platform accounts.
* Invitation permissions apply only to the intended scope.
* Invitation credentials expire.
* Invitations can be revoked.
* Accepted invitations cannot be reused.
* Wrong accounts cannot claim invitations.
* A user can accept an invitation to another workspace without losing or modifying their existing account/workspace ownership.

### Workspace membership

* A user can belong to multiple workspaces.
* A user's membership can differ between workspaces.
* Workspace A permissions do not leak into Workspace B.
* Switching workspaces changes the effective permission context.
* Switching workspaces changes visible projects and functionality appropriately.
* Users cannot access workspaces they do not belong to.
* Removed workspace membership prevents access.

### Dashboard and team permissions

* The application uses the same primary dashboard for different membership types.
* Dashboard functionality is controlled by current permissions.
* Admin/Owner functionality is only available to appropriately authorized users.
* Team members only see projects they are assigned/authorized to access.
* Team members only see relevant functionality.
* Admins have a clear interface for assigning permissions.
* Admins can control workspace-level permissions.
* Admins can control project-level permissions.
* Unauthorized functionality cannot be enabled through client-side tricks.
* Server-side authorization protects every sensitive action.
* Permission changes take effect correctly.

### Workspace security

* Project Contributor permissions do not grant workspace administration.
* Restricted team members cannot create workspaces unless explicitly authorized.
* Workspace-level operations require appropriate authorization.
* Project-level permissions never implicitly become workspace-level permissions.

### Client magic links

* Magic links are temporary authentication credentials.
* Magic links expire.
* Magic links can be revoked.
* Magic links are single-use for authentication.
* A consumed magic link cannot create a new session after session expiration.
* A client with an active session can reuse the same original entry URL without requesting another email.
* Expired sessions provide a simple new-link flow.
* New authentication links are sent to the verified/intended client email.
* Another person cannot use a client's magic link to authenticate.

### Sessions and tokens

* Sessions have intentional lifetimes.
* Sessions can be revoked where required.
* Refresh credentials are properly controlled.
* JWT/JOSE credentials have clear purposes and lifecycles.
* Magic-link, invitation, session, refresh, and access credentials remain separate.
* Credentials cannot be reused across unrelated authentication flows.
* Expired/revoked credentials are consistently rejected.
* Sensitive credentials are not unnecessarily exposed.
* Production signing/secrets configuration is secure and separated appropriately.

### Authorization

* Authentication and authorization remain separate.
* Authorization is evaluated using current permissions.
* Every sensitive server-side operation performs authorization.
* UI restrictions are backed by server-side enforcement.
* Direct API/server-action access cannot bypass permissions.
* Resource IDs cannot be manipulated to cross workspace/project boundaries.
* Permission escalation is prevented.
* Cross-project and cross-workspace access is prevented.

The final system should provide a **low-friction experience for legitimate users while maintaining strict security boundaries between accounts, workspaces, projects, clients, team members, invitations, sessions, and permissions.**
