import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Billing and Refunds",
  description: "Current billing and refund information for Handoff.",
  path: "/refund",
});

export default function RefundPage() {
  return (
    <LegalPage
      title="Billing and Refunds"
      description="Current payment and cancellation information for the Handoff beta."
      lastUpdated="October 4, 2026"
    >
      <h2>Current beta availability</h2>
      <p>
        Handoff is currently in beta. Online checkout and subscription changes
        are not available in the product, and the service does not currently
        accept subscription payments through the dashboard. Plan limits may
        still be shown in the app.
      </p>

      <h2>Refunds</h2>
      <p>
        Because hosted checkout is not available, Handoff does not currently
        have a standard subscription refund process. If you believe you were
        charged in error, contact the project through the{" "}
        <a href="/contact">Contact &amp; Support</a> page and include the
        account email and transaction reference. Do not send full payment card
        details.
      </p>

      <h2>When billing becomes available</h2>
      <p>
        If paid plans are introduced, plan prices, renewal terms, cancellation
        steps, and any applicable refund rules will be shown before purchase
        and this page will be updated. Mandatory rights under applicable law
        continue to apply.
      </p>

      <h2>Questions</h2>
      <p>
        For billing questions, use the contact details on our{" "}
        <a href="/contact">Contact &amp; Support</a> page.
      </p>
    </LegalPage>
  );
}
