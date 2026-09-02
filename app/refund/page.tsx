import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "How to cancel your subscription and request a refund for Handoff.",
};

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      description="How to cancel your subscription and request a refund."
      lastUpdated="September 1, 2026"
    >
      <h2>1. Cancellation</h2>
      <h3>1.1 How to Cancel</h3>
      <p>
        You can cancel your paid subscription at any time by:
      </p>
      <ul>
        <li>
          Navigating to <strong>Dashboard → Billing</strong> and selecting
          the downgrade/cancel option
        </li>
        <li>
          Contacting us at {/* TODO: Replace with actual email */}{" "}
          <a href="mailto:support@handoff.noorulhassan.com">support@handoff.noorulhassan.com</a>
        </li>
      </ul>

      <h3>1.2 When Cancellation Takes Effect</h3>
      <p>
        Cancellation takes effect at the end of your current billing period.
        You will continue to have access to paid features until that date.
        After cancellation, your account will revert to the free tier.
      </p>

      <h3>1.3 What Happens to Your Data</h3>
      <p>
        After cancellation, your projects, clients, and data remain intact on
        the free tier. If you choose to delete your account entirely, your
        data will be removed within {/* TODO: Update retention period */}{" "}
        30 days, except where required by law.
      </p>

      <h2>2. Refunds</h2>
      <h3>2.1 Eligibility</h3>
      {/* TODO: Update with your actual refund policy */}
      <p>
        We offer refunds within <strong>14 days</strong> of your initial
        purchase if you are not satisfied with the Service. After 14 days,
        refunds are not provided for partial billing periods.
      </p>

      <h3>2.2 How to Request a Refund</h3>
      <p>
        To request a refund, contact us at{" "}
        {/* TODO: Replace with actual email */}{" "}
        <a href="mailto:support@handoff.noorulhassan.com">support@handoff.noorulhassan.com</a> with:
      </p>
      <ul>
        <li>The email address associated with your account</li>
        <li>Your order or transaction reference</li>
        <li>The reason for your refund request</li>
      </ul>

      <h3>2.3 Refund Processing</h3>
      <p>
        Approved refunds are processed within 5–10 business days to the
        original payment method. You will receive an email confirmation when
        the refund is issued.
      </p>

      <h3>2.4 Exceptions</h3>
      <p>
        Refunds may not be available if:
      </p>
      <ul>
        <li>The request is made more than 14 days after purchase</li>
        <li>
          The account was used in violation of our{" "}
          <a href="/terms">Terms of Service</a>
        </li>
        <li>
          The refund request is made in bad faith (e.g., repeated refund
          requests after re-subscribing)
        </li>
      </ul>

      <h2>3. Free Tier</h2>
      <p>
        The free tier is provided at no cost and is not subject to refunds.
        You may delete your account at any time if you no longer wish to use
        the Service.
      </p>

      <h2>4. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Changes will be posted on
        this page with an updated &quot;Last updated&quot; date. Material
        changes will be communicated via email.
      </p>

      <h2>5. Contact</h2>
      <p>
        For refund or cancellation questions, contact us at:
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
