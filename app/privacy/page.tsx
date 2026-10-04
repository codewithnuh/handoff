import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "What information Handoff processes to provide project and client management.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="What information Handoff handles, why it is used, and how to contact the project."
      lastUpdated="October 4, 2026"
    >
      <h2>About this policy</h2>
      <p>
        This policy describes information processed by the Handoff hosted
        service. Handoff is open source under the{" "}
        <a
          href="https://github.com/codewithnuh/handoff/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          MIT License
        </a>
        . When someone else hosts an instance, that operator controls the
        instance and is responsible for its privacy practices.
      </p>

      <h2>Information you provide</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address, and
          authentication information.
        </li>
        <li>
          <strong>Workspace content:</strong> projects, tasks, deliverables,
          clients, team memberships, comments, approvals, invoices, and files
          that you create or upload.
        </li>
        <li>
          <strong>Invitations and portal activity:</strong> invitee and client
          email addresses, plus comments, requests, and approvals made through
          project portals.
        </li>
        <li>
          <strong>Support messages:</strong> information you choose to include
          when you contact the project.
        </li>
      </ul>
      <p>
        Passwords are processed by the authentication system and are not
        available to Handoff staff in readable form. Avoid placing sensitive
        information in project content unless it is needed for your work.
      </p>

      <h2>How information is used</h2>
      <p>Information is used to:</p>
      <ul>
        <li>Provide account, workspace, project, and client portal features.</li>
        <li>Authenticate users and enforce workspace and project permissions.</li>
        <li>Send account verification, password reset, and invitation emails.</li>
        <li>Respond to support requests and maintain the service.</li>
        <li>Protect the service, investigate abuse, and resolve technical issues.</li>
      </ul>
      <p>
        The application does not currently include an advertising or product
        analytics service.
      </p>

      <h2>Service providers</h2>
      <p>
        To run the service, information may be processed by infrastructure
        configured by the instance operator, including a PostgreSQL database,
        an email delivery provider, and UploadThing for file uploads. The
        application source does not determine the specific hosting, database,
        or email provider used by a deployment. Those providers may process
        information under their own terms and privacy policies.
      </p>

      <h2>Sharing</h2>
      <p>
        Handoff does not sell personal information or share it for targeted
        advertising. Workspace owners and teammates with the relevant
        permissions can access workspace content. Information may also be
        disclosed when necessary to operate the service, respond to a valid
        legal request, protect users and the service, or handle a transfer of
        the service.
      </p>

      <h2>Cookies and sessions</h2>
      <p>
        Essential session cookies keep account and client portal access working.
        See the <a href="/cookies">Cookie Policy</a> for details.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Workspace content is retained while it is stored in the service. The
        application does not publish a fixed deletion or backup retention
        period. To ask about access, correction, or deletion of information,
        contact the project using the details on the{" "}
        <a href="/contact">Contact &amp; Support</a> page. The instance
        operator may need to retain some information to meet legal obligations,
        resolve disputes, or protect the service.
      </p>

      <h2>Security</h2>
      <p>
        Handoff includes authentication rate limits, server-side access checks,
        scoped client portal sessions, and private file upload authorization.
        Security of hosting, database access, backups, and deployment secrets
        depends on the operator. See our <a href="/security">Security</a> page.
      </p>

      <h2>Children</h2>
      <p>
        Handoff is a business productivity service and is not intended for
        children under 16. If you believe a child has provided account
        information, contact the project so the instance operator can review
        the request.
      </p>

      <h2>Self-hosted instances</h2>
      <p>
        If you use an instance operated by someone other than the Handoff
        project, contact that operator with privacy questions or requests. The
        Handoff project does not receive data from independently hosted
        installations.
      </p>

      <h2>Updates and contact</h2>
      <p>
        This policy may change as the service changes. Updates will be posted
        here with a revised date. For privacy questions or requests, use the
        contact details on our <a href="/contact">Contact &amp; Support</a>{" "}
        page.
      </p>
    </LegalPage>
  );
}
