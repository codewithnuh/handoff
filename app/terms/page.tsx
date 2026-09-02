import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms and conditions governing your use of Handoff.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="Please read these terms carefully before using Handoff."
      lastUpdated="September 1, 2026"
    >
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using Handoff (&quot;the Service&quot;), you agree to
        be bound by these Terms of Service. If you do not agree to these
        terms, do not use the Service.
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
        . These Terms govern your use of the hosted service we operate. If you
        self-host Handoff, the MIT License governs your use of the code, and
        you are responsible for your own terms of service and legal
        compliance. We do not control and are not responsible for self-hosted
        instances.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Handoff is a client and project management platform for freelancers
        and creative teams. It provides project tracking, deliverable
        management, client portals, and team collaboration features.
      </p>

      <h2>3. Account Registration</h2>
      <ul>
        <li>
          You must be at least {/* TODO: Update minimum age */}16 years old to
          create an account.
        </li>
        <li>
          You must provide accurate and complete registration information.
        </li>
        <li>
          You are responsible for maintaining the confidentiality of your
          account credentials.
        </li>
        <li>
          You are responsible for all activity that occurs under your account.
        </li>
        <li>
          You must notify us immediately of any unauthorized use of your
          account.
        </li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose</li>
        <li>
          Upload malware, viruses, or any code designed to disrupt the Service
        </li>
        <li>
          Attempt to gain unauthorized access to other users&apos; accounts or
          system infrastructure
        </li>
        <li>
          Use the Service to send unsolicited communications (spam)
        </li>
        <li>Interfere with or disrupt the Service or servers</li>
        <li>
          Violate any applicable laws or regulations
        </li>
        <li>
          Resell or redistribute the Service without written permission
        </li>
      </ul>

      <h2>5. Your Content</h2>
      <h3>5.1 Ownership</h3>
      <p>
        You retain all rights to the content you create, upload, or share
        through Handoff (projects, deliverables, comments, files, etc.). We do
        not claim ownership of your content.
      </p>

      <h3>5.2 License to Us</h3>
      <p>
        By using the Service, you grant us a limited license to host, store,
        and display your content solely for the purpose of providing the
        Service to you.
      </p>

      <h3>5.3 Client Content</h3>
      <p>
        You are responsible for obtaining any necessary permissions from your
        clients before sharing their information through the client portal.
      </p>

      <h2>6. Subscriptions and Billing</h2>
      {/* TODO: Update once billing is connected */}
      <h3>6.1 Free Tier</h3>
      <p>
        Handoff offers a free tier with limited features. We reserve the right
        to modify the free tier at any time with reasonable notice.
      </p>

      <h3>6.2 Paid Plans</h3>
      <p>
        Paid subscriptions are billed in advance on a recurring basis. By
        selecting a paid plan, you authorize us to charge your payment method
        at the start of each billing cycle.
      </p>

      <h3>6.3 Cancellation</h3>
      <p>
        You may cancel your subscription at any time from your account
        settings. Cancellation takes effect at the end of the current billing
        period. See our{" "}
        <a href="/refund">Refund &amp; Cancellation Policy</a> for details.
      </p>

      <h3>6.4 Price Changes</h3>
      <p>
        We may change subscription prices with at least 30 days&apos; notice.
        Price changes will apply at the start of your next billing cycle.
      </p>

      <h2>7. Intellectual Property</h2>
      <h3>7.1 The Handoff Codebase</h3>
      <p>
        The Handoff source code is released under the{" "}
        <a
          href="https://github.com/codewithnuh/handoff/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          MIT License
        </a>
        . You are free to use, modify, and distribute the code in accordance
        with that license.
      </p>

      <h3>7.2 The Hosted Service</h3>
      <p>
        The hosted Handoff service, including its branding, design, and
        infrastructure, is owned by us and protected by copyright, trademark,
        and other intellectual property laws. You may not copy, modify, or
        distribute the hosted service without our written consent.
      </p>

      <h2>8. Service Availability</h2>
      <p>
        We strive to maintain high availability but do not guarantee
        uninterrupted service. We may perform maintenance, updates, or
        modifications that temporarily affect availability. We will provide
        reasonable notice for planned downtime.
      </p>

      <h2>9. Limitation of Liability</h2>
      {/* TODO: Legal review recommended */}
      <p>
        To the maximum extent permitted by law, Handoff shall not be liable
        for any indirect, incidental, special, consequential, or punitive
        damages, or any loss of profits or revenue, whether incurred directly
        or indirectly. Our total liability shall not exceed the amount you
        paid us in the twelve (12) months preceding the claim.
      </p>

      <h2>10. Disclaimer of Warranties</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;
        without warranties of any kind, whether express or implied, including
        but not limited to implied warranties of merchantability, fitness for
        a particular purpose, and non-infringement.
      </p>

      <h2>11. Termination</h2>
      <p>
        We may suspend or terminate your access to the Service at any time,
        with or without cause, with or without notice. Upon termination, your
        right to use the Service ceases immediately. We may retain your data
        as required by law or for legitimate business purposes.
      </p>

      <h2>12. Governing Law</h2>
      {/* TODO: Update with actual jurisdiction */}
      <p>
        These Terms shall be governed by and construed in accordance with the
        laws of [YOUR JURISDISDICTION], without regard to its conflict of law
        principles.
      </p>

      <h2>13. Changes to These Terms</h2>
      <p>
        We reserve the right to modify these Terms at any time. We will notify
        you of material changes by posting the updated Terms on this page and
        updating the &quot;Last updated&quot; date. Your continued use of the
        Service after changes constitutes acceptance of the updated Terms.
      </p>

      <h2>14. Contact</h2>
      <p>
        For questions about these Terms of Service, contact us at:
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
