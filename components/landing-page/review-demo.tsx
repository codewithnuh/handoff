"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, FileText, MessageSquareText } from "lucide-react";

type View = "studio" | "client";
type Decision = "approved" | "changes" | null;

export function ReviewDemo() {
  const [view, setView] = useState<View>("client");
  const [decision, setDecision] = useState<Decision>(null);
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 0.22;
  const status = decision === "approved"
    ? "Approved"
    : decision === "changes"
      ? "Changes requested"
      : "Ready for review";

  return (
    <div id="product-demo" className="landing-review-demo">
      <div className="landing-review-toolbar">
        <div className="landing-review-views" role="group" aria-label="Choose a project preview">
          <button
            type="button"
            aria-pressed={view === "studio"}
            onClick={() => setView("studio")}
            className={`landing-review-view${view === "studio" ? " is-active" : ""}`}
          >
            Your workspace
          </button>
          <button
            type="button"
            aria-pressed={view === "client"}
            onClick={() => setView("client")}
            className={`landing-review-view${view === "client" ? " is-active" : ""}`}
          >
            Client portal
          </button>
        </div>
        <span className="landing-review-demo-label"><span /> Interactive preview</span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          className="landing-review-window"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="landing-review-windowbar">
            <div className="landing-review-identity">
              <span className="landing-review-glyph">{view === "studio" ? "h" : "N"}</span>
              <span>{view === "studio" ? "Northstar Studio" : "Northstar Coffee"}</span>
            </div>
            <div className="landing-review-breadcrumb">
              <span>Brand identity</span><span aria-hidden="true">/</span><span>Deliverables</span>
            </div>
            <span className={`landing-review-status${decision === "approved" ? " is-approved" : decision === "changes" ? " needs-changes" : ""}`}>
              <i aria-hidden="true" />{status}
            </span>
          </div>

          <div className="landing-review-body">
            <div className="landing-review-heading">
              <div>
                <p>{view === "studio" ? "DELIVERABLE · ROUND 2" : "READY FOR YOUR REVIEW"}</p>
                <h3>Brand direction</h3>
                <span>Updated today by Alex Morgan</span>
              </div>
              <span className="landing-review-page-count" aria-hidden="true">
                02 <i /> 08
              </span>
            </div>

            <div className="landing-review-file">
              <div className="landing-review-file-art" aria-hidden="true">
                <span>N<span>·</span></span><i /><b /><em />
              </div>
              <div className="landing-review-file-meta">
                <span className="landing-review-file-icon"><FileText size={15} aria-hidden="true" /></span>
                <span><strong>Brand direction — round 2.pdf</strong><small>PDF · 8 pages · 4.2 MB</small></span>
                <span className="landing-review-file-version">V2</span>
              </div>
            </div>

            <div className="landing-review-note">
              <span className="landing-review-comment-icon"><MessageSquareText size={14} aria-hidden="true" /></span>
              <p>
                <strong>{view === "studio" ? "Project note" : "Jamie Morgan · Northstar Coffee"}</strong>
                <span>We’ve refined the type and color system from your last round of feedback.</span>
              </p>
              <span className="landing-review-time">2h</span>
            </div>

            <div className="landing-review-actions">
              {view === "client" ? (
                <>
                  <button type="button" className="landing-review-secondary" onClick={() => setDecision("changes")}>
                    Request changes
                  </button>
                  <button type="button" className="landing-review-approve" onClick={() => setDecision("approved")}>
                    <Check size={14} aria-hidden="true" /> Approve deliverable
                  </button>
                </>
              ) : (
                <p><span className="landing-review-private-dot" /> Your internal notes stay in your workspace.</p>
              )}
            </div>
            <p className="sr-only" aria-live="polite">
              {decision === "approved" ? "Demo: deliverable approved." : decision === "changes" ? "Demo: changes requested." : ""}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="landing-review-caption">
        Switch views, then try an approval. Clients see only the project you share.
      </p>
    </div>
  );
}
