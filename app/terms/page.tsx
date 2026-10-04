import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description: "Terms for using the Handoff hosted service.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="A practical guide to using Handoff and managing the work you store in it."
      lastUpdated="October 4, 2026"
    >
      <h2>Using Handoff</h2>
      <p>
        Handoff is a project and client management service for freelancers and
        teams. By using the hosted service, you agree to these terms. If you
        do not agree, do not use the service. Handoff is also available as
        open-source software under the{" "}
        <a
          href="https://github.com/codewithnuh/handoff/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          MIT License
        </a>
        ; these terms apply to the hosted service, not independently operated
        installations.
      </p>

      <h2>Your account</h2>
      <p>
        Provide accurate account information, keep your sign-in credentials
        secure, and use an account you are authorized to control. You are
        responsible for activity performed through your account. Tell the
        service operator promptly if you believe your account has been
        compromised. Handoff is a business service and is not intended for
        users under 16.
      </p>

      <h2>Workspace data</h2>
      <p>
        You retain your rights to the information and files you add to Handoff.
        You give the service operator permission to host, process, and display
        that content only as needed to provide and maintain the service. You
        are responsible for having permission to add client or team
        information and to share it with people you invite.
      </p>

      <h2>Acceptable use</h2>
      <p>You may not use Handoff to:</p>
      <ul>
        <li>Break the law or infringe another person&apos;s rights.</li>
        <li>Upload malware or attempt to compromise accounts or infrastructure.</li>
        <li>Disrupt the service or access data outside your permissions.</li>
        <li>Send spam or abuse invitations and client communications.</li>
        <li>Resell access to the hosted service without permission.</li>
      </ul>

      <h2>Plans and payments</h2>
      <p>
        Handoff is in beta. Online checkout and subscription changes are not
        currently available. If paid plans are introduced, prices, billing
        periods, renewal, and cancellation terms will be shown before purchase.
        See <a href="/refund">Billing and Refunds</a> for current information.
      </p>

      <h2>Availability and changes</h2>
      <p>
        Features may change as Handoff is developed. The service may be
        temporarily unavailable for maintenance, updates, or operational
        issues. No uninterrupted availability is promised. We will post
        material changes to these terms on this page with a revised date.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        The service operator may restrict or suspend access when reasonably
        needed to protect users, the service, or comply with law, including
        when these terms are violated. You may stop using Handoff at any time.
        For questions about workspace data, use the contact details on the{" "}
        <a href="/contact">Contact &amp; Support</a> page.
      </p>

      <h2>Warranties and liability</h2>
      <p>
        To the extent allowed by law, the hosted service is provided as
        available, without a promise that it will be uninterrupted or suitable
        for every purpose. Nothing in these terms excludes rights or remedies
        that cannot legally be excluded or limited. To the extent permitted by
        law, the service operator is not responsible for indirect or
        consequential losses arising from use of the service.
      </p>

      <h2>Applicable rights</h2>
      <p>
        These terms do not remove consumer or other mandatory rights that apply
        where you live. If a part of these terms cannot be enforced, the
        remaining parts continue to apply to the extent permitted by law.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about these terms, use the contact details on our{" "}
        <a href="/contact">Contact &amp; Support</a> page.
      </p>
    </LegalPage>
  );
}
