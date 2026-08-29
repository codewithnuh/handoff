"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ──────────────────────────────────────────────

type Step =
  | "idle"
  | "cursor-appear"
  | "move-to-create"
  | "hover-create"
  | "click-create"
  | "modal-open"
  | "move-to-name"
  | "type-name"
  | "move-to-desc"
  | "type-desc"
  | "move-to-client"
  | "select-client"
  | "move-to-dates"
  | "fill-dates"
  | "move-to-submit"
  | "hover-submit"
  | "click-submit"
  | "modal-close"
  | "dashboard-done"
  | "project-click"
  | "project-view"
  | "project-done"
  | "portal-view"
  | "portal-done"
  | "complete";

type DemoId = "dashboard" | "projects" | "portal";

const DEMOS: DemoId[] = ["dashboard", "projects", "portal"];

const PROJECT_CARDS = [
  { client: "Acme Corp", name: "Brand Refresh", description: "Complete brand identity overhaul including logo, colors, and guidelines.", status: "IN_PROGRESS", progress: 68, dueDate: "Aug 24", deliverables: 3, startDate: "Jul 1" },
  { client: "TechStart Inc", name: "Mobile App", description: "Cross-platform mobile app for task management.", status: "IN_PROGRESS", progress: 42, dueDate: "Sep 10", deliverables: 5, startDate: "Aug 1" },
  { client: "Greenfield Co", name: "Marketing Campaign", description: "Q4 marketing campaign assets and landing page.", status: "PLANNING", progress: 15, dueDate: "Oct 1", deliverables: 2, startDate: "Aug 15" },
];

const ACTIVITY_ITEMS = [
  { name: "Alex", action: "created Mobile App", time: "Today, 9:14 AM", isClient: false },
  { name: "Sarah", action: "approved brand guidelines", time: "Yesterday, 4:30 PM", isClient: true },
  { name: "Alex", action: "uploaded deliverable to Marketing Campaign", time: "Yesterday, 2:15 PM", isClient: false },
  { name: "James", action: "requested changes on Logo Concepts", time: "Aug 25, 11:00 AM", isClient: true },
];

// ─── Icons ──────────────────────────────────────────────

const I = {
  dashboard: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>,
  folder: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v9a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6.5 3.5A1 1 0 005.8 3H3a1 1 0 00-1 1z" /></svg>,
  user: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 14v-1a3 3 0 00-3-3H6a3 3 0 00-3 3v1" /><circle cx="8" cy="4.5" r="2.5" /></svg>,
  users: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 14v-1a3 3 0 00-3-3H5a3 3 0 00-3 3v1" /><circle cx="5.5" cy="4.5" r="2.5" /><path d="M15 14v-1a3 3 0 00-2-2.83" /><circle cx="11.5" cy="4.5" r="2.5" /></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5" /><path d="M13.3 10a1.5 1.5 0 00.3 1.65l.05.05a1.82 1.82 0 01-1.28 3.1 1.82 1.82 0 01-1.29-.53l-.05-.05a1.5 1.5 0 00-1.65-.3 1.5 1.5 0 00-.91 1.37v.16a1.82 1.82 0 01-3.64 0v-.08A1.5 1.5 0 005.35 14.2a1.5 1.5 0 00-1.65.3l-.05.05a1.82 1.82 0 01-2.57-2.57l.05-.05a1.5 1.5 0 00.3-1.65 1.5 1.5 0 00-1.37-.91H.26A1.82 1.82 0 01.26 8.32h.08A1.5 1.5 0 001.65 6.8a1.5 1.5 0 00-.3-1.65l-.05-.05A1.82 1.82 0 013.57 2.53l.05.05a1.5 1.5 0 001.65.3h.07a1.5 1.5 0 00.91-1.37V.87A1.82 1.82 0 018.87.87v.08a1.5 1.5 0 00.91 1.37 1.5 1.5 0 001.65-.3l.05-.05a1.82 1.82 0 012.57 2.57l-.05.05a1.5 1.5 0 00-.3 1.65v.07a1.5 1.5 0 001.37.91h.16a1.82 1.82 0 010 3.64h-.08a1.5 1.5 0 00-1.37.91z" /></svg>,
  activity: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  userPlus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  calendar: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  folderKanban: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>,
  checkSmall: <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2.5 6 2.2 2.2L9.5 3.5" /></svg>,
  chevronRight: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>,
  logout: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  message: (c?: string) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  dollar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  clientBadge: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>,
  approve: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  reject: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
};

// ─── macOS Traffic Lights ───────────────────────────────

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full bg-[#ff5f57]" />
      <span className="size-2.5 rounded-full bg-[#febc2e]" />
      <span className="size-2.5 rounded-full bg-[#28c840]" />
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────

function Sidebar({ active }: { active: string }) {
  const items = [
    { label: "Dashboard", icon: I.dashboard, key: "dashboard" },
    { label: "Projects", icon: I.folder, key: "projects" },
    { label: "Clients", icon: I.user, key: "clients" },
    { label: "Team", icon: I.users, key: "team" },
    { label: "Settings", icon: I.settings, key: "settings" },
  ];
  return (
    <aside className="hidden w-[180px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-3">
        <Image src="/logo.png" width={22} height={22} alt="" aria-hidden="true" className="size-[22px] object-contain" />
        <span className="text-xs font-semibold">Handoff</span>
      </div>
      <div className="border-b border-sidebar-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1.5">
          <div className="flex size-5 items-center justify-center rounded bg-sidebar-primary/20 text-[9px] font-bold text-sidebar-primary">A</div>
          <p className="truncate text-[10px] font-medium">Acme Studio</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {items.map((item) => (
          <div key={item.key} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${item.key === active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/70"}`}>
            {item.icon}<span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border px-2 py-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-sidebar-foreground/70">{I.logout}<span>Logout</span></div>
      </div>
    </aside>
  );
}

// ─── Stat Cards ─────────────────────────────────────────

function StatCards({ count }: { count: number }) {
  const s = [
    { title: "Active projects", value: String(count), desc: "Projects currently in progress", icon: I.folder },
    { title: "Pending deliverables", value: "7", desc: "3 in review · 2 changes requested", icon: I.clock },
    { title: "Open client requests", value: "3", desc: "Requests waiting for action", icon: I.message("text-muted-foreground") },
    { title: "Outstanding invoices", value: "$2,400", desc: "1 invoice overdue", icon: I.dollar },
  ];
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {s.map((x) => (
        <div key={x.title} className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-medium text-muted-foreground">{x.title}</span>{x.icon}</div>
          <div className="text-lg font-bold tracking-tight">{x.value}</div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{x.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Activity Feed ──────────────────────────────────────

function ActivityFeed({ showNew }: { showNew?: boolean }) {
  return (
    <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium">{I.activity}Recent Activity</span>
        <span className="text-[9px] text-muted-foreground">client actions highlighted</span>
      </div>
      <div className="divide-y divide-border">
        <AnimatePresence>
          {showNew && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex items-start justify-between gap-3 py-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">{I.checkSmall}</div>
                <div className="min-w-0"><p className="text-[11px]"><span className="font-medium">Alex</span> <span className="text-muted-foreground">created Website Redesign</span></p><p className="text-[10px] text-muted-foreground">Brand Refresh</p></div>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">Just now</span>
            </motion.div>
          )}
        </AnimatePresence>
        {ACTIVITY_ITEMS.map((a) => (
          <div key={a.action} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <div className="flex items-start gap-2.5 min-w-0">
              {a.isClient ? <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">{I.clientBadge}</div> : <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">{I.checkSmall}</div>}
              <div className="min-w-0"><p className="text-[11px]"><span className="font-medium">{a.name}</span> <span className="text-muted-foreground">{a.action}</span></p><p className="text-[10px] text-muted-foreground">Brand Refresh</p></div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {a.isClient && <span className="inline-flex h-4 items-center rounded-full bg-secondary px-1.5 text-[8px] font-medium text-secondary-foreground">Client</span>}
              <span className="text-[10px] text-muted-foreground tabular-nums">{a.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function WorkflowDemo() {
  const [demo, setDemo] = useState<DemoId>("dashboard");
  const [step, setStep] = useState<Step>("idle");

  // Form state
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [clientSelected, setClientSelected] = useState(false);
  const [datesFilled, setDatesFilled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);
  const [projectCount, setProjectCount] = useState(4);
  const [showNewActivity, setShowNewActivity] = useState(false);

  // Projects state
  const [projectHighlighted, setProjectHighlighted] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const createBtnRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);
  const clientBtnRef = useRef<HTMLButtonElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const projectCardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const getPos = useCallback((el: HTMLElement | null) => {
    if (!el || !containerRef.current) return { x: 0, y: 0 };
    const c = containerRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 };
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setProjectName("");
    setProjectDesc("");
    setClientSelected(false);
    setDatesFilled(false);
    setModalOpen(false);
    setSubmitHovered(false);
    setProjectCount(4);
    setShowNewActivity(false);
    setProjectHighlighted(false);
    setShowProjectDetail(false);
    const next = DEMOS[(DEMOS.indexOf(demo) + 1) % DEMOS.length];
    setDemo(next);
    setTimeout(() => setStep("cursor-appear"), 600);
  }, [demo]);

  useEffect(() => {
    const t = setTimeout(() => setStep("cursor-appear"), 1200);
    return () => clearTimeout(t);
  }, []);

  // Step progression
  useEffect(() => {
    if (step === "idle") return;
    const s = (fn: () => void, ms: number) => { timerRef.current = setTimeout(fn, ms); };

    switch (step) {
      case "cursor-appear":
        s(() => setStep(demo === "projects" ? "move-to-create" : demo === "portal" ? "portal-view" : "move-to-create"), 500);
        break;
      // Dashboard: Create Project workflow
      case "move-to-create":
        s(() => setStep("hover-create"), 800);
        break;
      case "hover-create":
        s(() => setStep("click-create"), 600);
        break;
      case "click-create":
        if (demo === "projects") {
          s(() => setStep("project-click"), 300);
        } else {
          s(() => { setModalOpen(true); setStep("modal-open"); }, 300);
        }
        break;
      case "modal-open":
        s(() => setStep("move-to-name"), 500);
        break;
      case "move-to-name":
        s(() => setStep("type-name"), 400);
        break;
      case "type-name":
        break;
      case "move-to-desc":
        s(() => setStep("type-desc"), 400);
        break;
      case "type-desc":
        break;
      case "move-to-client":
        s(() => { setClientSelected(true); setStep("select-client"); }, 500);
        break;
      case "select-client":
        s(() => setStep("move-to-dates"), 500);
        break;
      case "move-to-dates":
        s(() => { setDatesFilled(true); setStep("fill-dates"); }, 500);
        break;
      case "fill-dates":
        s(() => setStep("move-to-submit"), 600);
        break;
      case "move-to-submit":
        s(() => setStep("hover-submit"), 600);
        break;
      case "hover-submit":
        setSubmitHovered(true);
        s(() => setStep("click-submit"), 600);
        break;
      case "click-submit":
        s(() => {
          setModalOpen(false);
          setProjectCount(5);
          setShowNewActivity(true);
          setStep("dashboard-done");
        }, 300);
        break;
      case "dashboard-done":
        s(() => setStep("complete"), 2500);
        break;
      // Projects: click card → open detail
      case "project-click":
        s(() => { setProjectHighlighted(true); setStep("project-view"); }, 500);
        break;
      case "project-view":
        s(() => { setShowProjectDetail(true); setStep("project-done"); }, 300);
        break;
      case "project-done":
        s(() => setStep("complete"), 3000);
        break;
      // Portal: show comment
      case "portal-view":
        s(() => setStep("portal-done"), 100);
        break;
      case "portal-done":
        s(() => setStep("complete"), 3000);
        break;
      case "complete":
        s(() => reset(), 2500);
        break;
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [step, demo, reset]);

  // Typing: Project Name
  useEffect(() => {
    if (step !== "type-name") return;
    const target = "Website Redesign";
    if (projectName.length >= target.length) {
      const t = setTimeout(() => setStep("move-to-desc"), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProjectName(target.slice(0, projectName.length + 1)), 55);
    return () => clearTimeout(t);
  }, [step, projectName]);

  // Typing: Description
  useEffect(() => {
    if (step !== "type-desc") return;
    const target = "A modern redesign of the company website";
    if (projectDesc.length >= target.length) {
      const t = setTimeout(() => setStep("move-to-client"), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProjectDesc(target.slice(0, projectDesc.length + 1)), 35);
    return () => clearTimeout(t);
  }, [step, projectDesc]);

  // ── Cursor ──
  let cx = -20, cy = -20, co = 0;

  if (demo === "dashboard") {
    if (step === "move-to-create" || step === "hover-create" || step === "click-create") {
      const p = getPos(createBtnRef.current);
      cx = p.x; cy = p.y; co = 1;
    } else if (step === "modal-open" || step === "move-to-name" || step === "type-name") {
      if (modalOpen) {
        const p = getPos(nameInputRef.current);
        cx = p.x + projectName.length * 7.2 + 8; cy = p.y; co = 1;
      }
    } else if (step === "move-to-desc" || step === "type-desc") {
      if (modalOpen) {
        const p = getPos(descInputRef.current);
        cx = p.x + Math.min(projectDesc.length, 30) * 6.5 + 8; cy = p.y + 20; co = 1;
      }
    } else if (step === "move-to-client" || step === "select-client") {
      if (modalOpen) {
        const p = getPos(clientBtnRef.current);
        cx = p.x; cy = p.y; co = 1;
      }
    } else if (step === "move-to-dates" || step === "fill-dates") {
      if (modalOpen) {
        const p = getPos(submitBtnRef.current);
        cx = p.x - 80; cy = p.y - 30; co = 1;
      }
    } else if (step === "move-to-submit" || step === "hover-submit" || step === "click-submit") {
      if (modalOpen) {
        const p = getPos(submitBtnRef.current);
        cx = p.x; cy = p.y; co = 1;
      }
    }
  } else if (demo === "projects") {
    if (step === "move-to-create" || step === "hover-create" || step === "click-create" || step === "project-click") {
      const p = getPos(projectCardRef.current);
      cx = p.x; cy = p.y; co = 1;
    }
  }

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="mb-4 flex items-center justify-center gap-1">
        {(["dashboard", "projects", "portal"] as const).map((d) => (
          <button key={d} onClick={() => {
            setDemo(d); setStep("idle"); setProjectName(""); setProjectDesc("");
            setClientSelected(false); setDatesFilled(false); setModalOpen(false);
            setSubmitHovered(false); setProjectCount(4); setShowNewActivity(false);
            setProjectHighlighted(false); setShowProjectDetail(false);
            setTimeout(() => setStep("cursor-appear"), 400);
          }} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${demo === d ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}>
            {d === "dashboard" ? "Dashboard" : d === "projects" ? "Projects" : "Client Portal"}
          </button>
        ))}
      </div>
      <p className="mb-4 text-center text-[11px] text-muted-foreground">
        {demo === "dashboard" ? "Create a project from your workspace" : demo === "projects" ? "Browse and open project details" : "What your clients see and interact with"}
      </p>

      <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg">
        {/* macOS traffic lights bar */}
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
          <TrafficLights />
        </div>

        <div className="flex h-[400px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={demo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-1 overflow-hidden">

              {/* ── Dashboard ── */}
              {demo === "dashboard" && !showProjectDetail && (
                <>
                  <Sidebar active="dashboard" />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <header className="border-b-2 border-border bg-card px-4 py-3 md:px-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-muted-foreground">Good morning, Alex</p>
                          <h2 className="text-secondary-foreground font-bold text-2xl">Acme Studio</h2>
                          <p className="text-muted-foreground">Here&apos;s what&apos;s happening across your projects today.</p>
                        </div>
                        <div className="flex items-center gap-x-3">
                          <button className="inline-flex h-8 items-center gap-1 rounded-md border border-transparent bg-secondary px-2.5 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">{I.userPlus} Add Client</button>
                          <button ref={createBtnRef} className={`inline-flex h-8 items-center gap-1 rounded-md border border-transparent bg-primary px-2.5 text-[11px] font-medium text-primary-foreground transition-all ${(step === "hover-create" || step === "click-create") ? "bg-primary/80 shadow-sm" : ""}`}>{I.plus} Create Project</button>
                        </div>
                      </div>
                    </header>
                    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-5">
                      <StatCards count={projectCount} />
                      <ActivityFeed showNew={showNewActivity} />
                    </div>
                  </div>
                  {/* Modal */}
                  <AnimatePresence>
                    {modalOpen && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                        <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ type: "spring", visualDuration: 0.3, bounce: 0.15 }} className="w-[90%] max-w-[420px] rounded-xl border border-border bg-card p-5 shadow-xl">
                          <h3 className="text-sm font-semibold text-foreground">Create New Project</h3>
                          <p className="mt-1 text-[11px] text-muted-foreground">Create a new project to get started.</p>
                          <div className="mt-4 space-y-3">
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-foreground">Project Name</label>
                              <input ref={nameInputRef} readOnly value={projectName} placeholder="Project Name" className={`h-7 w-full rounded-md border bg-input/20 px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground ${(step === "move-to-name" || step === "type-name") ? "border-ring ring-2 ring-ring/30" : "border-input"}`} />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-foreground">Project Description</label>
                              <textarea ref={descInputRef} readOnly value={projectDesc} placeholder="Project Description" className={`flex min-h-16 w-full resize-none rounded-md border bg-input/20 px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground ${(step === "move-to-desc" || step === "type-desc") ? "border-ring ring-2 ring-ring/30" : "border-input"}`} />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-foreground">Client</label>
                              <button ref={clientBtnRef} className={`flex h-7 w-full items-center justify-between rounded-md border bg-input/20 px-2 text-[11px] outline-none ${(step === "move-to-client" || step === "select-client") ? "border-ring ring-2 ring-ring/30" : "border-input"} ${clientSelected ? "text-foreground" : "text-muted-foreground"}`}>
                                {clientSelected ? "Acme Corp" : "Select a client..."}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="mb-1 block text-[11px] font-medium text-foreground">Start Date</label><input readOnly type="date" value={datesFilled ? "2026-08-28" : ""} className={`h-7 w-full rounded-md border bg-input/20 px-2 text-sm text-foreground outline-none ${(step === "move-to-dates" || step === "fill-dates") ? "border-ring ring-2 ring-ring/30" : "border-input"}`} /></div>
                              <div><label className="mb-1 block text-[11px] font-medium text-foreground">Due Date</label><input readOnly type="date" value={datesFilled ? "2026-09-30" : ""} className={`h-7 w-full rounded-md border bg-input/20 px-2 text-sm text-foreground outline-none ${(step === "move-to-dates" || step === "fill-dates") ? "border-ring ring-2 ring-ring/30" : "border-input"}`} /></div>
                            </div>
                            <button ref={submitBtnRef} className={`mt-1 inline-flex h-8 items-center justify-center rounded-md border border-transparent bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-all ${submitHovered ? "bg-primary/80 shadow-sm" : ""}`}>Create Project</button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* ── Projects: List ── */}
              {demo === "projects" && !showProjectDetail && (
                <>
                  <Sidebar active="projects" />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <header className="border-b border-border bg-card px-4 py-3 md:px-6">
                      <h2 className="text-sm font-bold text-secondary-foreground">Projects</h2>
                      <p className="text-[11px] text-muted-foreground">Manage your workspace projects, deliverable status, and client access.</p>
                    </header>
                    <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 md:px-6">
                      <div className="relative flex-1">
                        <input readOnly placeholder="Search projects..." className="h-7 w-full rounded-md border border-input bg-input/20 pl-8 pr-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground" />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">{I.search}</div>
                      </div>
                      <button className="inline-flex h-7 items-center rounded-md border border-border bg-card px-2 text-[10px] font-medium text-foreground">All Clients ▾</button>
                      <button className="inline-flex h-7 items-center rounded-md border border-border bg-card px-2 text-[10px] font-medium text-foreground">All Statuses ▾</button>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-5">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {PROJECT_CARDS.map((p, i) => (
                          <div key={p.name} ref={i === 0 ? projectCardRef : undefined} className={`rounded-lg bg-card p-3 ring-1 ring-foreground/10 transition-all ${(step === "project-click" || step === "project-view") && i === 0 ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"}`}>
                            <div className="mb-2 flex items-center justify-between">
                              <span className="truncate text-[11px] font-medium text-muted-foreground max-w-[70%]">{p.client}</span>
                              <span className={`inline-flex h-5 items-center rounded-full px-2 text-[9px] font-medium ${p.status === "IN_PROGRESS" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{p.status === "IN_PROGRESS" ? "In Progress" : "Planning"}</span>
                            </div>
                            <h3 className={`text-sm font-semibold ${(step === "project-click" || step === "project-view") && i === 0 ? "text-primary" : "text-foreground"}`}>{p.name}</h3>
                            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{p.description}</p>
                            <div className="mt-3 border-t border-border pt-3">
                              <div className="mb-1 flex items-end justify-between"><span className="text-[10px] text-muted-foreground">Progress</span><span className="text-[11px] font-medium tabular-nums">{p.progress}%</span></div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} /></div>
                              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">{I.calendar} {p.dueDate}</span>
                                <span className="flex items-center gap-1">{I.folderKanban} {p.deliverables} Deliverable{p.deliverables !== 1 ? "s" : ""}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Projects: Detail ── */}
              {demo === "projects" && showProjectDetail && (
                <>
                  <Sidebar active="projects" />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <header className="border-b border-border bg-card px-4 py-3 md:px-6">
                      <h2 className="text-sm font-bold text-secondary-foreground">Projects</h2>
                      <p className="text-[11px] text-muted-foreground">Manage your workspace projects, deliverable status, and client access.</p>
                    </header>
                    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-5">
                      {/* Breadcrumb */}
                      <div className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>Projects</span>{I.chevronRight}<span className="text-foreground font-medium">Brand Refresh</span>
                      </div>
                      {/* Header card */}
                      <div className="mb-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-sm font-bold text-secondary-foreground">Brand Refresh</h2>
                              <span className="inline-flex h-5 items-center gap-1 rounded-full bg-primary/10 px-2 text-[9px] font-medium text-primary"><span className="size-1.5 rounded-full bg-primary" />In Progress</span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">Complete brand identity overhaul including logo, colors, and guidelines.</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 md:grid-cols-4">
                          <div><p className="text-[9px] text-muted-foreground">Client</p><p className="text-[11px] font-medium">Acme Corp</p></div>
                          <div><p className="text-[9px] text-muted-foreground">Start Date</p><p className="text-[11px] font-medium">Jul 1, 2026</p></div>
                          <div><p className="text-[9px] text-muted-foreground">Due Date</p><p className="text-[11px] font-medium">Aug 24, 2026</p></div>
                          <div><p className="text-[9px] text-muted-foreground">Progress</p><p className="text-[11px] font-medium">68%</p></div>
                        </div>
                      </div>
                      {/* Tabs */}
                      <div className="mb-4 flex gap-1 border-b border-border">
                        <button className="border-b-2 border-primary px-3 py-1.5 text-[11px] font-medium text-primary">Deliverables (3)</button>
                        <button className="px-3 py-1.5 text-[11px] text-muted-foreground">Requests (1)</button>
                        <button className="px-3 py-1.5 text-[11px] text-muted-foreground">Activity</button>
                      </div>
                      {/* Deliverables */}
                      <div className="mb-4 rounded-lg bg-card ring-1 ring-foreground/10">
                        <div className="divide-y divide-border">
                          {[
                            { name: "Brand Guidelines v2.pdf", status: "In Review", color: "bg-yellow-500/10 text-yellow-700" },
                            { name: "Logo Final.svg", status: "Approved", color: "bg-green-500/10 text-green-700" },
                            { name: "Website Mockup.fig", status: "Changes Requested", color: "bg-red-500/10 text-red-700" },
                          ].map((d) => (
                            <div key={d.name} className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-md bg-muted">{I.folder}</div>
                                <div>
                                  <p className="text-[11px] font-medium">{d.name}</p>
                                  <p className="text-[10px] text-muted-foreground">Uploaded 2 days ago</p>
                                </div>
                              </div>
                              <span className={`inline-flex h-5 items-center rounded-full px-2 text-[9px] font-medium ${d.color}`}>{d.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Tasks */}
                      <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                        <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-medium">Tasks</span><span className="text-[10px] text-muted-foreground tabular-nums">8/12</span></div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full w-[68%] rounded-full bg-primary" /></div>
                        <div className="mt-2 space-y-1">
                          {["Audit existing brand", "Create color palette", "Design logo variations", "Typography system"].map((t) => (
                            <div key={t} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px]">
                              <div className="flex size-4 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground">{I.checkSmall}</div>
                              <span className="text-muted-foreground line-through">{t}</span>
                            </div>
                          ))}
                          {["Icon set", "Stationery design", "Social media templates", "Brand launch plan"].map((t) => (
                            <div key={t} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px]">
                              <div className="size-4 shrink-0 rounded-full border border-muted-foreground/30" />
                              <span>{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Client Portal ── */}
              {demo === "portal" && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <header className="border-b border-border bg-card px-4 py-3 md:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Image src="/logo.png" width={20} height={20} alt="" aria-hidden="true" className="size-5 object-contain" /><span className="text-[11px] font-semibold">Handoff</span></div>
                      <div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground">Sarah&apos;s Workspace</span><div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">S</div></div>
                    </div>
                  </header>
                  <div className="flex-1 overflow-y-auto bg-background p-4 md:p-5">
                    <div className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><span>Projects</span>{I.chevronRight}<span className="text-foreground font-medium">Brand Refresh</span></div>
                    <div className="mb-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
                      <div className="flex items-center gap-2"><h2 className="text-sm font-bold text-secondary-foreground">Brand Refresh</h2><span className="inline-flex h-5 items-center gap-1 rounded-full bg-primary/10 px-2 text-[9px] font-medium text-primary"><span className="size-1.5 rounded-full bg-primary" />In Progress</span></div>
                      <p className="mt-1 text-[11px] text-muted-foreground">Complete brand identity overhaul including logo, colors, and guidelines.</p>
                      <div className="mt-2"><div className="mb-1 flex items-end justify-between"><span className="text-[10px] text-muted-foreground">Overall progress</span><span className="text-sm font-semibold tabular-nums">68%</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full w-[68%] rounded-full bg-primary" /></div><p className="mt-1 text-[10px] text-muted-foreground">8 of 12 tasks completed</p></div>
                    </div>
                    <div className="mb-4 rounded-lg bg-card ring-1 ring-foreground/10">
                      <div className="border-b border-border px-4 py-2.5"><span className="text-[11px] font-medium">Deliverables</span></div>
                      <div className="divide-y divide-border">
                        {[
                          { name: "Brand Guidelines v2.pdf", status: "In Review", color: "bg-yellow-500/10 text-yellow-700" },
                          { name: "Logo Final.svg", status: "Approved", color: "bg-green-500/10 text-green-700" },
                          { name: "Website Mockup.fig", status: "Changes Requested", color: "bg-red-500/10 text-red-700" },
                        ].map((d) => (
                          <div key={d.name} className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-2.5"><div className="flex size-7 items-center justify-center rounded-md bg-muted">{I.folder}</div><div><p className="text-[11px] font-medium">{d.name}</p><p className="text-[10px] text-muted-foreground">Uploaded 2 days ago</p></div></div>
                            <span className={`inline-flex h-5 items-center rounded-full px-2 text-[9px] font-medium ${d.color}`}>{d.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
                      <p className="mb-2.5 text-[11px] font-medium">Review Actions</p>
                      <div className="flex items-center gap-2">
                        <button className="inline-flex h-7 items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2.5 text-[10px] font-medium text-green-700 transition-colors hover:bg-green-100">{I.approve} Approve</button>
                        <button className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-[10px] font-medium text-red-700 transition-colors hover:bg-red-100">{I.reject} Request Changes</button>
                      </div>
                    </div>
                    <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium">{I.message("text-muted-foreground")}Comments</div>
                      <div className="space-y-2">
                        <div className="rounded-md bg-muted/50 p-3 text-xs"><div className="mb-1.5 flex items-center gap-2"><span className="font-medium">Sarah</span><span className="text-muted-foreground">· Aug 26, 4:30 PM</span></div><p className="text-muted-foreground">Love the color palette! The primary aubergine works perfectly.</p></div>
                        <AnimatePresence>
                          {(step === "portal-done" || step === "complete") && (
                            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="ml-4 rounded-md border border-primary/10 bg-primary/5 p-3 text-xs">
                              <div className="mb-1.5 flex items-center gap-2"><span className="font-medium">You</span><span className="text-muted-foreground">· Just now</span></div>
                              <p className="text-muted-foreground">Thanks! Updated the logo based on your feedback.</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input readOnly value={step === "complete" ? "Looks great, approved!" : ""} placeholder="Leave a comment..." className="h-7 flex-1 rounded-md border border-input bg-input/20 px-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground" />
                        <button className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-[10px] font-medium text-primary-foreground">Send</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Cursor */}
          {demo !== "portal" && (
            <motion.div animate={{ x: cx, y: cy, opacity: co }} transition={{ type: "spring", visualDuration: 0.4, bounce: 0.05 }} className="pointer-events-none absolute left-0 top-0 z-30" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="#1d1c1d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}>
                <path d="M5 3l14 8-6.5 2L9 20z" />
              </svg>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
