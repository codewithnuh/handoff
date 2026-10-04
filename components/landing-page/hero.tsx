"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDot,
  Clock3,
  FileText,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Users,
} from "lucide-react";

const EASE = [0.23, 1, 0.32, 1] as const;

export function Hero() {
  return (
    <section className="landing-hero" aria-labelledby="hero-title">
      <div className="landing-wrap">
        <div className="landing-hero-copy">
          <motion.p
            className="landing-eyebrow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <span className="landing-eyebrow-mark" aria-hidden="true" />
            Project management for independent work
          </motion.p>

          <motion.h1
            id="hero-title"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: EASE }}
          >
            Good work deserves
            <br className="hidden sm:block" /> a cleaner handoff.
          </motion.h1>

          <motion.div
            className="landing-hero-bottom"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          >
            <p>
              Keep project details, client feedback, and invoices together.
              Share a focused project view so every client knows what needs
              their input and what happens next.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button-primary" href="/register">
                Start your workspace <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="landing-button-link" href="#product-demo">
                Preview the client handoff <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div
          id="product"
          className="product-frame"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.25, ease: EASE }}
          role="img"
          aria-label="Preview of a Handoff workspace with projects, deliverable progress, and a client approval waiting for review"
        >
          <div className="product-topbar">
            <div className="product-brand">
              <span className="product-brand-glyph">h</span>
              <span>handoff</span>
            </div>
            <div className="product-breadcrumb">Northstar Studio <span>/</span> Overview</div>
            <div className="product-top-actions">
              <span className="product-shortcut"><Search size={12} /> Search <kbd>⌘ K</kbd></span>
              <span className="product-avatar">NS</span>
            </div>
          </div>

          <div className="product-layout">
            <aside className="product-rail" aria-hidden="true">
              <span className="product-rail-label">WORKSPACE</span>
              <span className="product-rail-item is-active"><LayoutGrid size={14} /> Overview</span>
              <span className="product-rail-item"><CircleDot size={14} /> Projects <i>4</i></span>
              <span className="product-rail-item"><Users size={14} /> Clients</span>
              <span className="product-rail-item"><FileText size={14} /> Invoices</span>
              <span className="product-rail-label product-rail-label-spaced">YOUR WORK</span>
              <span className="product-rail-project"><b className="project-dot dot-teal" /> Northstar rebrand</span>
              <span className="product-rail-project"><b className="project-dot dot-violet" /> Atlas website</span>
              <span className="product-profile"><span className="product-avatar">AM</span> Alex Morgan</span>
            </aside>

            <div className="product-content">
              <div className="product-page-heading">
                <div>
                  <span className="product-kicker">MONDAY, OCTOBER 5</span>
                  <h2>Good morning, Alex</h2>
                  <p>Here&apos;s what needs your attention.</p>
                </div>
                <button type="button" tabIndex={-1} className="product-create"><Plus size={14} /> New project</button>
              </div>

              <div className="product-stats">
                <div><span>Active projects</span><strong>06</strong><small>Across 4 clients</small></div>
                <div><span>For your review</span><strong>02</strong><small className="product-lime-text">One needs a decision</small></div>
                <div><span>Outstanding</span><strong>$4,250</strong><small>2 invoices sent</small></div>
              </div>

              <div className="product-section-heading">
                <div><h3>Active projects</h3><span>Recent work across your studio</span></div>
                <MoreHorizontal size={16} />
              </div>

              <div className="product-table">
                <div className="product-table-head"><span>PROJECT</span><span>STATUS</span><span>PROGRESS</span><span>DUE</span></div>
                <div className="product-row">
                  <span className="product-project-cell"><b className="project-dot dot-teal" /><span><strong>Northstar rebrand</strong><small>Northstar Coffee</small></span></span>
                  <span className="product-status"><i className="status-dot status-working" /> In progress</span>
                  <span className="product-progress"><i><b style={{ width: "72%" }} /></i><small>72%</small></span>
                  <span className="product-date">Oct 14</span>
                </div>
                <div className="product-row">
                  <span className="product-project-cell"><b className="project-dot dot-violet" /><span><strong>Atlas website</strong><small>Atlas Ventures</small></span></span>
                  <span className="product-status"><i className="status-dot status-review" /> In review</span>
                  <span className="product-progress"><i><b style={{ width: "88%" }} /></i><small>88%</small></span>
                  <span className="product-date">Oct 18</span>
                </div>
                <div className="product-row">
                  <span className="product-project-cell"><b className="project-dot dot-orange" /><span><strong>Spring campaign</strong><small>Fieldwork Supply</small></span></span>
                  <span className="product-status"><i className="status-dot status-planning" /> Planning</span>
                  <span className="product-progress"><i><b style={{ width: "24%" }} /></i><small>24%</small></span>
                  <span className="product-date">Oct 22</span>
                </div>
              </div>

              <div className="product-review-card">
                <div className="product-review-icon"><Clock3 size={15} /></div>
                <div className="product-review-copy"><strong>Logo suite is waiting for approval</strong><span>Northstar Coffee · Sent 2 hours ago</span></div>
                <span className="product-review-action">View review <ArrowRight size={13} /></span>
                <span className="product-review-check"><Check size={12} /></span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="landing-proofline">
          <span>Made for independent studios</span>
          <i aria-hidden="true" />
          <span>Clients review without an account</span>
          <i aria-hidden="true" />
          <span>Open source</span>
        </div>
      </div>
    </section>
  );
}
