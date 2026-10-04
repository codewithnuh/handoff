import { Check } from "lucide-react";
import { ReviewDemo } from "@/components/landing-page/review-demo";

const portalItems = [
  "A private view for each project",
  "Feedback beside the deliverable",
  "A clear approve-or-revise decision",
];

export function Comparison() {
  return (
    <section className="landing-section">
      <div className="landing-section-inner landing-portal-callout">
        <div>
          <p className="landing-section-label">The client side of the handoff</p>
          <h2>Clients review the work, never your whole workspace.</h2>
          <p className="landing-copy">
            Share one focused project view with the files, context, and next
            decision your client needs. Keep internal planning private.
          </p>
          <ul className="landing-portal-points">
            {portalItems.map((item) => (
              <li key={item}><Check size={14} aria-hidden="true" />{item}</li>
            ))}
          </ul>
        </div>

        <ReviewDemo />
      </div>
    </section>
  );
}
