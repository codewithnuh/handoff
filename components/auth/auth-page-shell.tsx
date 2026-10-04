import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import { HandoffMark } from "@/components/brand/handoff-mark";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  alternatePrompt: string;
  alternateLabel: string;
  alternateHref: string;
};

const workspaceBenefits = [
  "Keep client details beside the work",
  "Track every project and next step",
  "Share progress through a client portal",
];

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  alternatePrompt,
  alternateLabel,
  alternateHref,
}: AuthPageShellProps) {
  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link href="/" className="auth-brand" aria-label="Handoff home">
          <HandoffMark size={30} className="auth-brand-mark" />
          <span>Handoff</span>
        </Link>
        <Link href="/" className="auth-back-link">
          Back to home <ArrowUpRight aria-hidden="true" size={14} />
        </Link>
      </header>

      <div className="auth-main">
        <section className="auth-intro" aria-labelledby="auth-intro-title">
          <div className="auth-intro-copy">
            <p className="auth-eyebrow"><span /> Your freelance workspace</p>
            <h1 id="auth-intro-title">Good work deserves a clear handoff.</h1>
            <p className="auth-intro-description">
              Bring clients, projects, deliverables, and approvals into one calm place to run your business.
            </p>
          </div>

          <div className="auth-workspace-preview" aria-hidden="true">
            <div className="auth-preview-topline">
              <span className="auth-preview-dot" />
              <span>Workspace overview</span>
              <span className="auth-preview-date">THIS WEEK</span>
            </div>
            <div className="auth-preview-project">
              <span className="auth-preview-project-icon">N</span>
              <span className="auth-preview-project-copy"><strong>Northstar rebrand</strong><small>Brand identity · Northstar Studio</small></span>
              <span className="auth-preview-status"><i /> In progress</span>
            </div>
            <div className="auth-preview-progress"><span /></div>
            <div className="auth-preview-footer">
              <span>Next up</span><strong>Send logo concepts</strong><span>Tomorrow</span>
            </div>
          </div>

          <ul className="auth-benefits">
            {workspaceBenefits.map((benefit) => (
              <li key={benefit}><Check aria-hidden="true" size={15} />{benefit}</li>
            ))}
          </ul>
        </section>

        <section className="auth-form-side" aria-label={eyebrow}>
          <div className="auth-form-heading">
            <p>{eyebrow}</p>
            <h2>{title}</h2>
            <span>{description}</span>
          </div>
          {children}
          <p className="auth-alternate">
            {alternatePrompt}{" "}
            <Link href={alternateHref}>{alternateLabel}<ArrowUpRight aria-hidden="true" size={13} /></Link>
          </p>
          <p className="auth-privacy-note">
            By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </section>
      </div>

      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} Handoff</span>
        <span>Client work, thoughtfully organized.</span>
      </footer>
    </main>
  );
}
