import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "The cookies Handoff uses to keep your account and client portal working.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      description="A clear list of the browser cookies used by Handoff."
      lastUpdated="October 4, 2026"
    >
      <h2>How cookies are used</h2>
      <p>
        Handoff uses essential cookies to recognize signed-in users and protect
        access to private workspaces and client portals. The app does not use
        advertising cookies or a third-party analytics cookie.
      </p>

      <h2>Essential authentication cookies</h2>
      <ul>
        <li>
          <strong>Account session:</strong> Maintains your Handoff sign-in so
          private dashboard pages and actions can identify your account.
        </li>
        <li>
          <strong>Client portal session (cp_session):</strong> Keeps a client
          signed in to the specific project portal they were granted access to.
        </li>
      </ul>
      <p>
        These cookies are set when you sign in. Their lifetime follows the
        session settings for the service; signing out or session expiry ends
        access. Blocking them will prevent sign-in and portal access from
        working.
      </p>

      <h2>Analytics and preferences</h2>
      <p>
        Handoff does not currently set analytics, advertising, language, or
        theme preference cookies. If that changes, this policy will be updated
        to describe the additional cookies and their purpose.
      </p>

      <h2>Third-party services</h2>
      <p>
        Handoff uses third-party services to deliver features such as email
        and file uploads. The application does not intentionally use those
        services to set tracking cookies. Their handling of data is described
        in our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Managing cookies</h2>
      <p>
        Your browser lets you inspect, delete, or block cookies. Removing an
        active session cookie signs you out; blocking essential cookies may
        prevent account and client portal features from working.
      </p>

      <h2>Questions</h2>
      <p>
        For questions about this policy, use the contact details on our{" "}
        <a href="/contact">Contact &amp; Support</a> page.
      </p>
    </LegalPage>
  );
}
