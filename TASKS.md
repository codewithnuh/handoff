First of all I need clean maintable codebase 


PRODUCT SPECIFICATION: FEATURES & CONSTRAINTS
PART A: CORE FEATURES (What the system does)
1. Workspace & Identity

    Freelancer Account: Standard email/password registration.

    Workspace Creation: Freelancer creates a named workspace with a unique subdomain (e.g., myagency.yourapp.com).

    Team Invites: Freelancer invites teammates via email. Teammates receive a magic link to set their password—no traditional sign-up form.

2. Project Management

    Project CRUD: Create, update, archive, and close projects.

    Pinned Brief: Attach a rich-text "Scope of Work" to every project. This is the single source of truth.

    Delivery Checklist: Manually define deliverables (e.g., "Homepage Design", "Mobile Responsive") that act as a progress tracker.

    Milestone Timeline: Assign dates to milestones to set client expectations.

3. Deliverable & File Handling

    File Upload: Drag-and-drop support for images, PDFs, ZIPs, and Figma/InVision embed URLs.

    Context Note: Freelancer adds a note when submitting a deliverable (e.g., "Focus on the hero section").

    Submit for Review: A button that locks the deliverable (prevents further edits) and notifies the client.

    Auto-Versioning: Every new upload for the same project auto-increments the version number (v1, v2, v3). Previous versions remain accessible.

4. The Client Private Portal (Passwordless)

    Scoped Private Link: Every project generates a unique, shareable link that grants access to only that specific project.

    No Account Needed: Clients click the link. There is no registration, no password, no "Forgot Password" flow.

    Immersive Previewer: Clients view files directly in the browser (no downloading required). Supports images, PDFs, and HTML prototypes in an iframe.

    Strict Scoping: The client sees only the project name, the pinned brief, the deliverable list, and the activity feed. No workspace switcher, no settings, no other projects.

5. Surgical Feedback Tools

    Visual Annotation Pins: Clients click anywhere on the preview to drop a pin and attach a comment to that exact pixel/coordinate.

    Structured Feedback Forms: Instead of a blank text box, clients must select:

        Type: Bug / Design Tweak / Copy Change / Enhancement.

        Priority: Blocker / Nice-to-have.

    Async Video Feedback: Clients can record a short screen-share video (like Loom) directly inside the portal to talk through complex feedback.

6. Team Collaboration (RBAC)

    Granular Permissions Matrix (Two levels):

        Workspace Level: Owner (billing/delete) | Admin (manage all projects/members).

        Project Level (Override): Lead (full edit + submit to client) | Contributor (upload drafts only) | Observer (view-only).

    Need-to-Know Scoping: When inviting a teammate, the Freelancer selects which specific projects they can see. Teammates never see clients or projects they aren't assigned to.

    The Quality Gate: Contributors can upload drafts, but only the Lead can approve and push those drafts to the client portal (prevents juniors from shipping broken work).

7. The Revision Loop

    Change Summary: When a new version is submitted, clients see a summary: "3 files updated. 2 comments resolved. 1 new comment added."

    Visual Diff Viewer: A slider overlay that lets clients drag between the current and previous version to see exactly what changed (works for images).

    Comment Resolution: Clients/Freelancers manually mark comments as "Resolved". Resolved comments collapse to keep the UI clean.

8. Final Approval & Digital Handoff

    One-Click Digital Sign-off: Client clicks "Approve & Finalize". A simple e-signature pad (draw or type name) appears.

    Audit Certificate: The system generates a timestamped PDF certificate containing names, signatures, and approval date.

    Conditional Approval: If a client tries to approve while "Blocker" comments are unresolved, the system blocks them and forces resolution or reclassification to "Nice-to-have".

9. Smart Notifications & Focus

    Daily Digest: Clients receive a single daily email at 9 AM summarizing all activity (new submissions, resolved comments) instead of 50 individual emails.

    Urgent Override: Freelancers can mark a submission as "Urgent", which bypasses the digest and sends an instant push/email notification.

    Focus Mode Toggle: Freelancers can click a switch that instantly hides all other projects, notifications, and the sidebar—showing only the current deliverable they are editing.

PART B: SYSTEM CONSTRAINTS (The "Never" Rules)
Security & Access Constraints

    No Passwords for Clients: Clients shall never be asked to create a password. Access is strictly via time-limited, revocable signed links.

    Strict Project Scoping: A private link for Project A shall never grant even read-access to Project B. If a link is tampered with, the system must reject it entirely.

    Revocation Kill Switch: Freelancers must have a one-click "Revoke Link" button that instantly destroys all active sessions for that specific client link, regardless of expiration.

    Auditability: Every single interaction (view, comment, upload, approval) must be logged with a timestamp and the actor's identity. There is no "anonymous" activity.

Workflow & Collaboration Constraints

    Scope Creep Lock: If a client selects Type: Enhancement (new feature), the system must automatically flag that comment as "Out of Scope". It cannot be actioned until the Freelancer manually converts it into a new milestone (with implied cost/time).

    Contributor Limitation: A Contributor can upload drafts, but never directly notify the client. Only a Lead can click the "Submit for Review" button that triggers client notifications.

    Blocker Resolution: A project cannot transition to "Approved & Closed" while any comment marked as Priority: Blocker remains unresolved.

UI/UX Distraction Constraints

    Single Primary CTA: Every screen (client or freelancer) must have one dominant, unambiguous action button (e.g., "Submit for Review", "Approve", "Resolve Comment"). The user should never have to hunt for their next move.

    Client UI Minimalism: The client portal is stripped of all workspace navigation, billing info, and project switchers. It is a single-purpose review room.

Notification Constraints

    No Notification Spam: Routine updates (e.g., "File uploaded") are batched into the daily digest. Instant notifications are reserved exclusively for @mentions or submissions flagged as Urgent.

PART C: USER JOURNEY SUMMARY (The Happy Path)
Step	Actor	Action	System Response
1	Freelancer	Creates Project & uploads v1	Generates private link. Stores file.
2	Freelancer	Shares private link via email	Client receives no-registration link.
3	Client	Clicks link + drops visual pin + selects "Design Tweak / Blocker"	System flags comment. Sends digest notification.
4	Freelancer	Clicks "Focus Mode" → Updates file → Submits v2	System auto-generates diff summary. Notifies client instantly (if urgent).
5	Client	Reviews diff → Resolves old comment → Clicks "Approve & Sign"	System generates PDF certificate. Locks project. Closes loop.