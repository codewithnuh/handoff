import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Handoff protects your data and ensures the security of your projects and clients.",
};

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      description="How we protect your data and keep your projects safe."
      lastUpdated="September 1, 2026"
    >
      <h2>Our Commitment</h2>
      <p>
        Security is foundational to Handoff. We handle your project data,
        client information, and business files — and we take that
        responsibility seriously. This page describes the measures we take to
        protect your data.
      </p>

      <h2>Encryption</h2>
      <ul>
        <li>
          <strong>In transit:</strong> All connections to Handoff are encrypted
          using TLS (HTTPS). Data transmitted between your browser and our
          servers is always encrypted.
        </li>
        <li>
          <strong>At rest:</strong> Sensitive data stored in our database is
          encrypted at rest. File uploads are stored with our secure file
          storage provider with encryption enabled.
        </li>
      </ul>

      <h2>Authentication & Access</h2>
      <ul>
        <li>
          <strong>Password hashing:</strong> Passwords are hashed using bcrypt
          with a high work factor. We never store or have access to your
          plaintext password.
        </li>
        <li>
          <strong>Email verification:</strong> All accounts require email
          verification to prevent unauthorized access.
        </li>
        <li>
          <strong>Password reset:</strong> Secure token-based password reset
          flow with time-limited links.
        </li>
        <li>
          <strong>Session management:</strong> Authentication sessions are
          managed securely with httpOnly cookies.
        </li>
      </ul>

      <h2>Authorization & Access Controls</h2>
      <ul>
        <li>
          <strong>Workspace isolation:</strong> Data is strictly isolated
          between workspaces. Users can only access data within their
          authorized workspaces.
        </li>
        <li>
          <strong>Role-based access:</strong> Workspace owners, admins, and
          members have different permission levels. Project-level roles ensure
          team members only see what they need to.
        </li>
        <li>
          <strong>Client portal scoping:</strong> Client portal sessions are
          isolated to specific projects. Clients cannot access other projects
          or workspace data.
        </li>
      </ul>

      <h2>File Storage Security</h2>
      <ul>
        <li>
          Files are uploaded and served through UploadThing, a secure file
          storage provider with built-in access controls.
        </li>
        <li>
          File access is controlled through signed URLs and API-level
          permissions.
        </li>
        <li>
          Uploads are scanned and validated before storage.
        </li>
      </ul>

      <h2>Infrastructure</h2>
      {/* TODO: Update with actual providers */}
      <ul>
        <li>
          <strong>Hosting:</strong> [YOUR HOSTING PROVIDER] — with DDoS
          protection and automatic scaling.
        </li>
        <li>
          <strong>Database:</strong> [YOUR DATABASE PROVIDER] — with automated
          backups and encryption at rest.
        </li>
        <li>
          <strong>File storage:</strong> UploadThing — with secure upload
          endpoints and access controls.
        </li>
      </ul>

      <h2>Data Backups</h2>
      {/* TODO: Update with actual backup details */}
      <p>
        We perform automated database backups on a regular schedule. Backups
        are encrypted and stored securely. In the event of data loss, we can
        restore from the most recent backup.
      </p>

      <h2>Incident Response</h2>
      <p>
        In the event of a security incident affecting user data, we will:
      </p>
      <ul>
        <li>Investigate and contain the incident promptly</li>
        <li>Assess the scope and impact</li>
        <li>Notify affected users within 72 hours</li>
        <li>Take steps to prevent recurrence</li>
      </ul>

      <h2>Reporting Vulnerabilities</h2>
      <p>
        If you discover a security vulnerability in Handoff, please report it
        responsibly by contacting us at{" "}
        {/* TODO: Replace with actual security email */}
        <a href="mailto:security@handoff.noorulhassan.com">security@handoff.noorulhassan.com</a>.
        We will investigate all reports and respond promptly. Please do not
        disclose vulnerabilities publicly until we have had a chance to
        address them.
      </p>

      <h2>Compliance</h2>
      {/* TODO: Only include if actually applicable */}
      <p>
        We are committed to protecting user privacy in compliance with
        applicable data protection regulations. For details on how we handle
        your personal data, see our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>
      {/* TODO: Add if you have actual certifications */}
      {/* <p>
        Handoff is [SOC 2 Type II / ISO 27001] certified. [Certification details]
      </p> */}

      <h2>Self-Hosted Instances</h2>
      <p>
        Handoff is open source and can be self-hosted. This security page
        describes the measures we take for the hosted service we operate. If
        you self-host Handoff, security is your responsibility. You should:
      </p>
      <ul>
        <li>
          Keep your deployment up to date with the latest releases
        </li>
        <li>
          Configure TLS/HTTPS for all connections
        </li>
        <li>
          Use strong database credentials and restrict network access
        </li>
        <li>
          Enable regular backups and test restores
        </li>
        <li>
          Follow infrastructure security best practices for your hosting
          provider
        </li>
        <li>
          Monitor your instance for unauthorized access
        </li>
      </ul>
      <p>
        The source code is publicly available for security review. If you
        discover a vulnerability, please report it responsibly via{" "}
        <a href="mailto:security@handoff.noorulhassan.com">security@handoff.noorulhassan.com</a>.
      </p>
    </LegalPage>
  );
}
