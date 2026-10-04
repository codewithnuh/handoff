import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="landing-wrap" aria-labelledby="final-cta-heading">
      <div className="landing-cta">
        <div>
          <p className="landing-section-label">A steadier way to work</p>
          <h2 id="final-cta-heading">Make the next handoff easier.</h2>
          <p>
            Set up a project, invite a client, and keep their feedback beside
            the work. Start with the free plan.
          </p>
        </div>
        <Link className="landing-button-primary" href="/register">
          Create your workspace <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
