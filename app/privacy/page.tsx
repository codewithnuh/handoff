import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Handoff collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How we collect, use, and protect your personal information."
      lastUpdated="September 1, 2026"
    >
      <h2>1. Introduction</h2>
      <p>
        Welcome to Handoff (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
        We are committed to protecting your privacy. This Privacy Policy
        explains how we collect, use, disclose, and safeguard your information
        when you use our hosted platform.
      </p>
      {/* TODO: Replace with your actual legal entity name and jurisdiction */}
      <p>
        Handoff is operated by [YOUR LEGAL ENTITY NAME], registered in
        [YOUR COUNTRY/STATE].
      </p>

      <h3>Open Source &amp; Self-Hosting</h3>
      <p>
        Handoff is open source under the{" "}
        <a
          href="https://github.com/codewithnuh/handoff/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          MIT License
        </a>
        . This Privacy Policy applies only to the hosted service we operate
        (handoff.dev). If you self-host Handoff, you are the data controller
        and are responsible for your own privacy compliance, including
        providing a privacy policy to your users. We do not have access to
        data stored on self-hosted instances.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Account Information</h3>
      <p>When you create an account, we collect:</p>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Password (stored securely using bcrypt hashing)</li>
      </ul>

      <h3>2.2 Project and Client Data</h3>
      <p>As you use Handoff, we store:</p>
      <ul>
        <li>Projects, deliverables, and tasks you create</li>
        <li>Client information you add (names, emails)</li>
        <li>Files you upload via our file storage provider</li>
        <li>Comments, approvals, and activity within projects</li>
        <li>Invoices and financial data you generate</li>
      </ul>

      <h3>2.3 Client Portal Data</h3>
      <p>
        When you invite clients to the portal, we collect their email addresses
        and track their interactions (deliverable approvals, comments,
        requests) for the purpose of providing the service.
      </p>

      <h3>2.4 Usage Data</h3>
      <p>We may automatically collect:</p>
      <ul>
        <li>Device type and browser information</li>
        <li>Pages visited and features used</li>
        <li>IP address</li>
        {/* TODO: Add if you use analytics */}
        <li>
          [Analytics data — add if you use Google Analytics, Plausible, etc.]
        </li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use collected information to:</p>
      <ul>
        <li>Provide, maintain, and improve the Handoff service</li>
        <li>Process transactions and send related information</li>
        <li>Send administrative notifications (account updates, security alerts)</li>
        <li>Respond to your inquiries and provide support</li>
        <li>Monitor and analyze usage trends to improve user experience</li>
        <li>Detect, prevent, and address technical issues and fraud</li>
      </ul>

      <h2>4. Third-Party Services</h2>
      <p>We use the following third-party services that may process your data:</p>
      <ul>
        {/* TODO: Update with actual providers */}
        <li>
          <strong>File Storage:</strong> UploadThing — for secure file uploads
          and storage
        </li>
        <li>
          <strong>Database Hosting:</strong> [YOUR DATABASE PROVIDER]
        </li>
        <li>
          <strong>Application Hosting:</strong> [YOUR HOSTING PROVIDER]
        </li>
        <li>
          <strong>Email:</strong> [YOUR EMAIL SERVICE PROVIDER] — for
          transactional emails
        </li>
        {/* TODO: Add any analytics, error tracking, or other services */}
      </ul>
      <p>
        Each third-party service has its own privacy policy. We encourage you
        to review their policies.
      </p>

      <h2>5. Data Sharing</h2>
      <p>
        We do not sell your personal information. We may share your data only
        in the following circumstances:
      </p>
      <ul>
        <li>With your explicit consent</li>
        <li>To comply with legal obligations</li>
        <li>To protect our rights and safety</li>
        <li>
          In connection with a merger, acquisition, or sale of assets (with
          notice to you)
        </li>
      </ul>

      <h2>6. Data Retention</h2>
      <p>
        We retain your personal information for as long as your account is
        active or as needed to provide the service. We will also retain your
        data as necessary to comply with legal obligations, resolve disputes,
        and enforce our agreements.
      </p>
      {/* TODO: Update with actual retention period */}
      <p>
        If you delete your account, we will remove your personal data within
        [30/60/90] days, except where required by law.
      </p>

      <h2>7. Data Security</h2>
      <p>
        We implement industry-standard security measures including:
      </p>
      <ul>
        <li>Passwords hashed with bcrypt</li>
        <li>HTTPS encryption for all data in transit</li>
        <li>Role-based access controls within workspaces</li>
        <li>Secure file storage with access controls</li>
      </ul>
      <p>
        However, no method of transmission over the Internet is 100% secure,
        and we cannot guarantee absolute security.
      </p>

      <h2>8. Your Rights</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>Access the personal information we hold about you</li>
        <li>Correct inaccurate or incomplete data</li>
        <li>Request deletion of your personal data</li>
        <li>Object to or restrict processing of your data</li>
        <li>Data portability — receive your data in a structured format</li>
        <li>Withdraw consent at any time</li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        {/* TODO: Replace with actual email */}
        <a href="mailto:support@handoff.noorulhassan.com">support@handoff.noorulhassan.com</a>.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use cookies and similar technologies to maintain your session and
        improve your experience. For detailed information, see our{" "}
        <a href="/cookies">Cookie Policy</a>.
      </p>

      <h2>10. Children&apos;s Privacy</h2>
      {/* TODO: Update minimum age — typically 16 for GDPR */}
      <p>
        Handoff is not intended for users under the age of 16. We do not
        knowingly collect personal information from children. If we become
        aware that we have collected data from a child, we will take steps to
        delete it promptly.
      </p>

      <h2>11. Self-Hosted Instances</h2>
      <p>
        If you deploy Handoff on your own infrastructure, this Privacy Policy
        does not apply to your instance. As the operator of a self-hosted
        deployment, you are responsible for:
      </p>
      <ul>
        <li>
          Complying with applicable data protection laws (GDPR, CCPA, etc.)
        </li>
        <li>
          Providing your own privacy policy to your users
        </li>
        <li>
          Managing data retention, deletion, and security for your instance
        </li>
        <li>
          Handling data subject requests from your users
        </li>
      </ul>
      <p>
        The Handoff source code is available under the MIT License. We do not
        monitor or access data on self-hosted instances.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify
        you of any material changes by posting the new policy on this page and
        updating the &quot;Last updated&quot; date. Your continued use of
        Handoff after changes constitutes acceptance of the updated policy.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or our data practices,
        contact us at:
      </p>
      <ul>
        {/* TODO: Replace with actual contact info */}
        <li>
          Email: <a href="mailto:support@handoff.noorulhassan.com">support@handoff.noorulhassan.com</a>
        </li>
        <li>Address: [YOUR BUSINESS ADDRESS]</li>
      </ul>
    </LegalPage>
  );
}
