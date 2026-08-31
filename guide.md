# Review & Fix Team Permissions System

I want you to **analyze the current project first** before making changes. The permissions system is currently messy, inconsistent, and causing errors during testing. My goal is to make it **simple, maintainable, predictable, and secure**.

## Product model

The hierarchy is:

```text
User Account
  └── Workspace
       ├── Projects
       │    ├── Clients
       │    ├── Deliverables
       │    └── Tasks
       └── Team Members
```

A user can own their own workspaces and also be a member of other users' workspaces.

When a user accepts an invitation, they should gain access to the **inviting workspace**, not have that workspace treated as their own account/workspace.

In the UI, clearly distinguish workspaces, for example:

```text
My Workspace        Owner
Acme Agency         Member
```

If the user has no memberships, show a useful empty state.

## Team invitation flow

When an admin invites a team member, the admin should be able to configure:

* Which projects the member can access.
* Whether they can create projects.
* Whether they can manage/edit/delete projects.
* Whether they can manage clients/invite clients.
* Whether they can create/manage/delete deliverables.
* Whether they can create/manage/delete tasks.
* Whether they can access workspace settings.
* Other existing capabilities that are relevant to the current data model.

Avoid creating an unnecessarily complicated permission system. Use the **existing project/data model** and simplify it where possible.

## Permission-based experience

When a member switches into a workspace where they are a member:

* They should see the workspace dashboard.
* They should only see projects they have access to.
* They should only see clients/data they are authorized to access.
* Navigation and actions should reflect their permissions.
* If they have project-creation permission, the project creation functionality should be available.
* If they have client-management permission, the relevant client functionality should be available.
* If they do not have permission, the functionality should not be available.

Do not create a completely separate dashboard for team members. The existing dashboard should adapt based on the user's permissions.

## Security requirement

UI restrictions are not security.

Every sensitive action must also be protected server-side. A member must not be able to bypass permissions by:

* Calling server actions directly.
* Calling APIs directly.
* Changing IDs.
* Manipulating URLs.
* Modifying client-side state.
* Re-enabling disabled UI.

Permissions must be checked against the user's **current membership and permissions**.

## Account vs Workspace

A team member's membership in another workspace must not take control of their personal account.

For example:

```text
John's Account
├── John's Workspace       → Owner
└── Acme Workspace         → Member
```

John should still control his own account and own workspace while having limited access to Acme Workspace.

The workspace owner controls John's membership and permissions **inside Acme Workspace**, not John's entire platform account.

## Your task

1. Analyze the existing authentication, workspace, project, membership, invitation, and permission architecture.
2. Identify what is currently broken or unnecessarily complicated.
3. Propose a simpler permission model based on the existing data model.
4. Identify opportunities to improve maintainability and remove duplicated/inconsistent authorization logic.
5. Implement the necessary changes without introducing unnecessary architectural complexity.
6. Test normal flows and deliberate permission bypass attempts.
7. Preserve existing functionality that already works correctly.

Prioritize **clarity, maintainability, correct permission boundaries, and a simple team-member experience** over adding more permission complexity.
