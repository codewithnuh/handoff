import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Security",
  description: "How Handoff protects account, workspace, and client project access.",
};

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      description="The safeguards built into Handoff and what operators must configure."
      lastUpdated="October 4, 2026"
    >
      <p>
        Handoff is open-source project management software. Security for a
        hosted instance depends on both the application and the infrastructure
        chosen by its operator. This page describes protections implemented in
        the application; it does not claim a certification or a particular
        hosting, backup, or incident-response arrangement.
      </p>

      <h2>Account protection</h2>
      <ul>
        <li>
          Passwords are handled by Better Auth and are not stored as readable
          passwords. The application enforces password length limits and
          rate-limits sign-in, sign-up, and password-reset endpoints.
        </li>
        <li>
          Email verification uses single-use six-digit codes. Password reset
          uses a time-limited link.
        </li>
        <li>
          Authenticated routes use session cookies. Production deployments are
          configured to use secure cookies and same-site cookie handling.
        </li>
      </ul>

      <h2>Workspace and project access</h2>
      <p>
        Server-side actions check the caller&apos;s identity, workspace
        membership, role, and permissions before changing or returning
        protected data. Client portal sessions are signed and scoped to a
        project; file access is checked against project access rules.
      </p>

      <h2>File uploads</h2>
      <p>
        File uploads go through UploadThing using private file access. The
        application validates supported file types, size limits, and upload
        metadata, and checks project authorization before creating an upload
        intent. These controls do not replace malware scanning by a deployment
        operator.
      </p>

      <h2>Deployment security</h2>
      <p>
        Handoff does not choose or operate hosting, database, email, or backup
        infrastructure for self-hosted installations. Operators should keep
        dependencies and the deployment current, use HTTPS, protect secrets,
        restrict database access, and configure backups and recovery for their
        own environment. The hosted deployment&apos;s provider details are not
        published here because they are not defined by the application code.
      </p>

      <h2>Security reports</h2>
      <p>
        Please report vulnerabilities privately through the project&apos;s{" "}
        <a
          href="https://github.com/codewithnuh/handoff/security/advisories/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub security advisories
        </a>
        . Include steps to reproduce and any relevant impact. Please avoid
        posting details publicly until a fix or mitigation is available.
        General support questions can be sent through the{" "}
        <a href="/contact">Contact &amp; Support</a> page.
      </p>

      <h2>Open source and self-hosting</h2>
      <p>
        Handoff is available under the{" "}
        <a
          href="https://github.com/codewithnuh/handoff/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          MIT License
        </a>
        . If you run your own instance, you control its hosting, configuration,
        data, access policies, monitoring, backups, and user support.
      </p>
    </LegalPage>
  );
}
