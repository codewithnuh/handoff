import { Check, MessageSquareText } from "lucide-react";

const portalItems = [
  "Current deliverables",
  "Recent project updates",
  "Feedback and approvals",
];

export function Comparison() {
  return (
    <section className="landing-section">
      <div className="landing-section-inner landing-portal-callout">
        <div>
          <p className="landing-section-label">A client view with less noise</p>
          <h2>Your clients see what they need. You keep control.</h2>
          <p className="landing-copy">
            Share progress and collect decisions without opening up your whole
            workspace. Keep drafts and internal notes private for each project.
          </p>
          <ul className="landing-portal-points">
            {portalItems.map((item) => (
              <li key={item}><Check size={14} aria-hidden="true" />{item}</li>
            ))}
          </ul>
        </div>

        <div className="landing-portal-preview" aria-label="Example client project view">
          <div className="landing-portal-topline"><span>Northstar Coffee</span><span>Project update</span></div>
          <h3>Brand identity</h3>
          <p>Here is the final logo suite for your review.</p>
          <div className="landing-portal-file">
            <span className="landing-portal-file-icon"><MessageSquareText size={15} /></span>
            <span><strong>Logo suite · v3.pdf</strong><small>Updated today</small></span>
            <span className="landing-portal-status">Ready for review</span>
          </div>
          <div className="landing-portal-comment">
            <span className="product-avatar">JM</span>
            <p><strong>Jamie Morgan</strong><br />Looks great. The new mark feels right for us.</p>
          </div>
          <div className="landing-portal-actions"><span>Request a change</span><button type="button" tabIndex={-1}><Check size={13} /> Approve</button></div>
        </div>
      </div>
    </section>
  );
}
