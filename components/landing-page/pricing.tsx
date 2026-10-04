import Link from "next/link";
import { Check } from "lucide-react";

const freeFeatures = [
  "1 workspace",
  "Up to 3 active projects",
  "Unlimited team members",
  "Client portal and approvals",
];

const proFeatures = [
  "5 workspaces",
  "Up to 100 projects per workspace",
  "Everything in Free",
  "Priority support",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="landing-plan-features">
      {items.map((item) => (
        <li className="landing-plan-feature" key={item}>
          <Check size={13} aria-hidden="true" />{item}
        </li>
      ))}
    </ul>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="landing-section scroll-mt-20">
      <div className="landing-section-inner landing-pricing">
        <header className="landing-section-header">
          <p className="landing-section-label">Pricing</p>
          <h2>Start with the work you have today.</h2>
          <p>
            Handoff is free to self-host during beta. The paid plan is planned,
            but subscriptions and online checkout are not available yet.
          </p>
        </header>

        <div className="landing-pricing-panel">
          <article className="landing-plan">
            <div className="landing-plan-head">
              <div>
                <h3>Free</h3>
                <p>Core project and client management for your studio.</p>
              </div>
              <span className="landing-beta-note">Self-hostable</span>
            </div>
            <div className="landing-plan-price">$0 <small>forever</small></div>
            <FeatureList items={freeFeatures} />
            <Link className="landing-button-primary mt-5" href="/register">Get started free</Link>
          </article>

          <article className="landing-plan">
            <div className="landing-plan-head">
              <div>
                <h3>Pro</h3>
                <p>Planned for studios managing more workspaces and projects.</p>
              </div>
              <span className="landing-beta-note">Not in beta</span>
            </div>
            <div className="landing-plan-price">$12 <small>planned / month</small></div>
            <FeatureList items={proFeatures} />
            <span className="landing-plan-link">Available after beta</span>
          </article>
        </div>
      </div>
    </section>
  );
}
