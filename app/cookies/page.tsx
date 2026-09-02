import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How Handoff uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      description="How we use cookies and similar technologies on our platform."
      lastUpdated="September 1, 2026"
    >
      <h2>What Are Cookies</h2>
      <p>
        Cookies are small text files placed on your device when you visit a
        website. They help the site remember your preferences and provide a
        better experience.
      </p>

      <h2>Cookies We Use</h2>

      <h3>Essential Cookies</h3>
      <p>
        These cookies are necessary for Handoff to function properly. They
        cannot be disabled.
      </p>
      <ul>
        <li>
          <strong>Session cookie:</strong> Maintains your authentication
          session while you are signed in. Deleted when you close your
          browser or sign out.
        </li>
        <li>
          <strong>CSRF token:</strong> Protects against cross-site request
          forgery attacks on form submissions.
        </li>
      </ul>

      <h3>Functional Cookies</h3>
      {/* TODO: Add if you use any */}
      <ul>
        <li>
          [Add any functional cookies you use — e.g., theme preference,
          language selection]
        </li>
      </ul>

      <h3>Analytics Cookies</h3>
      {/* TODO: Add if you use analytics */}
      <p>
        [If you use Google Analytics, Plausible, PostHog, or any other
        analytics tool, list it here with its cookie details. If you do not
        use analytics, remove this section or state that you do not use
        analytics cookies.]
      </p>

      <h2>Third-Party Cookies</h2>
      {/* TODO: Update with actual third parties */}
      <p>
        Some third-party services we use may place cookies on your device:
      </p>
      <ul>
        <li>
          [List any third-party cookies — e.g., analytics, embedded content,
          payment processors]
        </li>
      </ul>

      <h2>Managing Cookies</h2>
      <p>
        You can control and manage cookies through your browser settings.
        Most browsers allow you to:
      </p>
      <ul>
        <li>View what cookies are set</li>
        <li>Delete cookies individually or all at once</li>
        <li>Block cookies from specific sites</li>
        <li>Block all cookies</li>
        <li>Clear cookies when you close the browser</li>
      </ul>
      <p>
        Note: Blocking essential cookies may prevent Handoff from functioning
        correctly.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. Changes will be
        posted on this page with an updated &quot;Last updated&quot; date.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about our use of cookies, contact us at{" "}
        {/* TODO: Replace with actual email */}
        <a href="mailto:support@handoff.noorulhassan.com">support@handoff.noorulhassan.com</a>.
      </p>
    </LegalPage>
  );
}
