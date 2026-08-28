"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ──────────────────────────────────────────────

type Step =
  | "idle"
  | "cursor-appear"
  | "move-to-action"
  | "hover-action"
  | "click-action"
  | "modal-open"
  | "move-to-input"
  | "focus-input"
  | "typing"
  | "move-to-submit"
  | "hover-submit"
  | "click-submit"
  | "modal-close"
  | "result"
  | "complete";

type DemoId = "create" | "review" | "portal";

interface DemoConfig {
  id: DemoId;
  label: string;
  description: string;
}

const DEMOS: DemoConfig[] = [
  {
    id: "create",
    label: "Create Project",
    description: "Start a new project in seconds",
  },
  {
    id: "review",
    label: "Client Review",
    description: "Clients approve work with one click",
  },
  {
    id: "portal",
    label: "Client Portal",
    description: "What your clients actually see",
  },
];

const TYPING_SPEED = 65;

// ─── SVG Icons ──────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4v9a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6.5 3.5A1 1 0 005.8 3H3a1 1 0 00-1 1z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 14v-1a3 3 0 00-3-3H6a3 3 0 00-3 3v1" />
      <circle cx="8" cy="4.5" r="2.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 14v-1a3 3 0 00-3-3H5a3 3 0 00-3 3v1" />
      <circle cx="5.5" cy="4.5" r="2.5" />
      <path d="M15 14v-1a3 3 0 00-2-2.83" />
      <circle cx="11.5" cy="4.5" r="2.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="2.5" />
      <path d="M13.3 10a1.5 1.5 0 00.3 1.65l.05.05a1.82 1.82 0 01-1.28 3.1 1.82 1.82 0 01-1.29-.53l-.05-.05a1.5 1.5 0 00-1.65-.3 1.5 1.5 0 00-.91 1.37v.16a1.82 1.82 0 01-3.64 0v-.08A1.5 1.5 0 005.35 14.2a1.5 1.5 0 00-1.65.3l-.05.05a1.82 1.82 0 01-2.57-2.57l.05-.05a1.5 1.5 0 00.3-1.65 1.5 1.5 0 00-1.37-.91H.26A1.82 1.82 0 01.26 8.32h.08A1.5 1.5 0 001.65 6.8a1.5 1.5 0 00-.3-1.65l-.05-.05A1.82 1.82 0 013.57 2.53l.05.05a1.5 1.5 0 001.65.3h.07a1.5 1.5 0 00.91-1.37V.87A1.82 1.82 0 018.87.87v.08a1.5 1.5 0 00.91 1.37 1.5 1.5 0 001.65-.3l.05-.05a1.82 1.82 0 012.57 2.57l-.05.05a1.5 1.5 0 00-.3 1.65v.07a1.5 1.5 0 001.37.91h.16a1.82 1.82 0 010 3.64h-.08a1.5 1.5 0 00-1.37.91z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Sidebar Component ──────────────────────────────────

function Sidebar({ activeItem }: { activeItem?: string }) {
  const navItems = [
    {
      label: "Dashboard",
      icon: <DashboardIcon />,
      active: activeItem === "dashboard",
    },
    {
      label: "Projects",
      icon: <FolderIcon />,
      active: activeItem === "projects",
    },
    { label: "Clients", icon: <UserIcon />, active: activeItem === "clients" },
    { label: "Team", icon: <UsersIcon />, active: activeItem === "team" },
    {
      label: "Settings",
      icon: <SettingsIcon />,
      active: activeItem === "settings",
    },
  ];

  return (
    <aside className="hidden w-[180px] shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-3">
        <Image
          src="/logo.png"
          width={22}
          height={22}
          alt=""
          aria-hidden="true"
          className="size-[22px] object-contain"
        />
        <span className="text-xs font-semibold">Handoff</span>
      </div>

      <div className="border-b border-sidebar-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1.5">
          <div className="flex size-5 items-center justify-center rounded bg-sidebar-primary/20 text-[9px] font-bold text-sidebar-primary">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-medium">Acme Studio</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
              item.active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-2 py-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-sidebar-foreground/70">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Logout</span>
        </div>
      </div>
    </aside>
  );
}

// ─── Stat Cards ─────────────────────────────────────────

function StatCards({ projectCount }: { projectCount: number }) {
  const stats = [
    {
      label: "Active projects",
      value: String(projectCount),
      desc: "Projects currently in progress",
      icon: "folder",
    },
    {
      label: "Pending deliverables",
      value: "7",
      desc: "3 in review · 2 changes requested",
      icon: "clock",
    },
    {
      label: "Open client requests",
      value: "3",
      desc: "Requests waiting for action",
      icon: "message",
    },
    {
      label: "Outstanding invoices",
      value: "$2,400",
      desc: "1 invoice overdue",
      icon: "dollar",
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg bg-card p-2.5 sm:p-3 ring-1 ring-foreground/10"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
              {stat.label}
            </span>
            {stat.icon === "folder" && <FolderIcon />}
            {stat.icon === "clock" && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="text-muted-foreground shrink-0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
            {stat.icon === "message" && (
              <MessageIcon className="text-muted-foreground shrink-0" />
            )}
            {stat.icon === "dollar" && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="text-muted-foreground shrink-0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            )}
          </div>
          <div className="text-base sm:text-lg font-bold tracking-tight">
            {stat.value}
          </div>
          <p className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground">
            {stat.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Activity Feed ──────────────────────────────────────

function ActivityFeed({
  showNew,
  newAction,
}: {
  showNew?: boolean;
  newAction?: string;
}) {
  const items = [
    {
      name: "You",
      action: "created Mobile App",
      time: "Today, 9:14 AM",
      isClient: false,
      type: "create",
    },
    {
      name: "Sarah",
      action: "approved brand guidelines",
      time: "Yesterday, 4:30 PM",
      isClient: true,
      type: "approve",
    },
    {
      name: "You",
      action: "uploaded deliverable to Marketing Campaign",
      time: "Yesterday, 2:15 PM",
      isClient: false,
      type: "upload",
    },
    {
      name: "James",
      action: "requested changes on Logo Concepts",
      time: "Aug 25, 11:00 AM",
      isClient: true,
      type: "comment",
    },
  ];

  return (
    <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium">
          <ActivityIcon />
          Recent Activity
        </span>
        <span className="hidden sm:inline text-[9px] text-muted-foreground">
          client actions highlighted
        </span>
      </div>
      <div className="divide-y divide-border">
        <AnimatePresence>
          {showNew && newAction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-start justify-between gap-3 py-2"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <CheckCircleIcon className="size-3 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px]">
                    <span className="font-medium">You</span>{" "}
                    <span className="text-muted-foreground">{newAction}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Acme Studio
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                Just now
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {items.map((item) => (
          <div
            key={item.action}
            className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {item.isClient ? (
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="text-primary"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                  </svg>
                </div>
              ) : (
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <CheckCircleIcon className="size-3 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px]">
                  <span className="font-medium">{item.name}</span>{" "}
                  <span className="text-muted-foreground">{item.action}</span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Acme Studio
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {item.isClient && (
                <span className="inline-flex h-4 items-center rounded-full bg-secondary px-1.5 text-[8px] font-medium text-secondary-foreground">
                  Client
                </span>
              )}
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {item.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Create Project Demo ────────────────────────────────

function CreateProjectDemo({
  step,
  typedText,
  inputFocused,
  projectHovered,
  submitHovered,
  modalOpen,
  actionBtnRef,
  inputRef,
  submitBtnRef,
}: {
  step: Step;
  typedText: string;
  inputFocused: boolean;
  projectHovered: boolean;
  submitHovered: boolean;
  modalOpen: boolean;
  actionBtnRef: React.RefObject<HTMLButtonElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  submitBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <>
      <Sidebar activeItem="dashboard" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header projectHovered={projectHovered} actionBtnRef={actionBtnRef} />
        <div className="flex-1 overflow-y-auto bg-background p-3 sm:p-4 md:p-5">
          <StatCards projectCount={4} />
          <ActivityFeed />
        </div>
      </div>
      <ModalOverlay
        modalOpen={modalOpen}
        inputFocused={inputFocused}
        typedText={typedText}
        submitHovered={submitHovered}
        title="Create New Project"
        inputRef={inputRef}
        submitBtnRef={submitBtnRef}
      />
    </>
  );
}

// ─── Client Review Demo ─────────────────────────────────

function ClientReviewDemo({
  step,
  modalOpen,
  inputFocused,
  typedText,
  submitHovered,
  projectHovered,
  actionBtnRef,
  inputRef,
  submitBtnRef,
}: {
  step: Step;
  modalOpen: boolean;
  inputFocused: boolean;
  typedText: string;
  submitHovered: boolean;
  projectHovered: boolean;
  actionBtnRef: React.RefObject<HTMLButtonElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  submitBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const deliverables = [
    {
      name: "Brand Guidelines v2.pdf",
      status: "In Review",
      statusColor: "bg-yellow-500/10 text-yellow-700",
      reviewable: true,
    },
    {
      name: "Logo Final.svg",
      status: "Approved",
      statusColor: "bg-green-500/10 text-green-700",
      reviewable: false,
    },
    {
      name: "Website Mockup.fig",
      status: "Changes Requested",
      statusColor: "bg-red-500/10 text-red-700",
      reviewable: false,
    },
  ];

  return (
    <>
      <Sidebar activeItem="projects" />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Project header */}
        <header className="border-b border-border bg-card px-3 py-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Projects</span>
            <ChevronRightIcon />
            <span className="text-foreground font-medium">Brand Refresh</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-secondary-foreground">
                Brand Refresh
              </h2>
              <p className="text-[11px] text-muted-foreground">
                3 deliverables · 2 in review
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted">
                <EyeIcon /> <span className="hidden sm:inline">Preview</span>
              </button>
              <button className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted">
                <DownloadIcon />{" "}
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-background p-3 sm:p-4 md:p-5">
          {/* Deliverables list */}
          <div className="mb-4 rounded-lg bg-card ring-1 ring-foreground/10">
            <div className="border-b border-border px-4 py-2.5">
              <span className="text-[11px] font-medium">Deliverables</span>
            </div>
            <div className="divide-y divide-border">
              {deliverables.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FolderIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium">
                        {d.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Uploaded 2 days ago
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`hidden sm:inline-flex h-5 items-center rounded-full px-2 text-[9px] font-medium ${d.statusColor}`}
                    >
                      {d.status}
                    </span>
                    {d.reviewable ? (
                      <button
                        ref={actionBtnRef}
                        className={`inline-flex h-6 items-center rounded-md border border-transparent bg-primary px-2 text-[10px] font-medium text-primary-foreground transition-all ${
                          projectHovered ? "bg-primary/80 shadow-sm" : ""
                        }`}
                      >
                        Review
                      </button>
                    ) : (
                      <span
                        className={`inline-flex sm:hidden h-5 items-center rounded-full px-2 text-[9px] font-medium ${d.statusColor}`}
                      >
                        {d.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <ActivityFeed
            showNew={step === "result"}
            newAction="approved Brand Guidelines v2.pdf"
          />
        </div>
      </div>
      <ReviewModal
        modalOpen={modalOpen}
        inputFocused={inputFocused}
        typedText={typedText}
        submitHovered={submitHovered}
        inputRef={inputRef}
        submitBtnRef={submitBtnRef}
      />
    </>
  );
}

// ─── Client Portal Demo ─────────────────────────────────

function PortalDemo({ step }: { step: Step }) {
  const [commentVisible, setCommentVisible] = useState(false);

  useEffect(() => {
    if (step === "result") {
      const t = setTimeout(() => setCommentVisible(true), 300);
      return () => clearTimeout(t);
    }
    setCommentVisible(false);
  }, [step]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Portal header */}
      <header className="border-b border-border bg-card px-3 py-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              width={20}
              height={20}
              alt=""
              aria-hidden="true"
              className="size-5 object-contain"
            />
            <span className="text-[11px] font-semibold">Handoff</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] text-muted-foreground">
              Sarah&apos;s Workspace
            </span>
            <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
              S
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-background p-3 sm:p-4 md:p-5">
        {/* Project info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Brand Refresh</span>
            <span className="inline-flex h-4 items-center rounded-full bg-primary/10 px-1.5 text-[9px] font-medium text-primary">
              <span className="mr-1 inline-flex size-1.5 rounded-full bg-primary" />
              In Progress
            </span>
          </div>
          <h2 className="mt-1 text-sm font-bold text-secondary-foreground">
            Brand Guidelines v2
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Due Aug 24 · 68% complete
          </p>
        </div>

        {/* Progress */}
        <div className="mb-4 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <div className="flex items-end justify-between">
            <p className="text-[11px] font-medium">Overall progress</p>
            <span className="text-sm font-semibold tabular-nums">68%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[68%] rounded-full bg-primary" />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            8 of 12 tasks completed
          </p>
        </div>

        {/* Tasks */}
        <div className="mb-4 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium">Tasks</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              8/12
            </span>
          </div>
          <div className="space-y-1">
            {[
              "Audit existing brand",
              "Create color palette",
              "Design logo variations",
              "Typography system",
              "Icon set",
              "Stationery design",
              "Brand guidelines doc",
              "Digital assets",
            ].map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[11px]"
              >
                <div className="flex size-4 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground">
                  <CheckCircleIcon className="size-2.5" />
                </div>
                <span className="text-muted-foreground line-through">{t}</span>
              </div>
            ))}
            {[
              "Social media templates",
              "Presentation deck",
              "Email signatures",
              "Brand launch plan",
            ].map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[11px]"
              >
                <div className="size-4 shrink-0 rounded-full border border-muted-foreground/30" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium">
            <MessageIcon className="text-muted-foreground" />
            Comments
          </div>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                S
              </div>
              <div>
                <p className="text-[11px]">
                  <span className="font-medium">Sarah</span>{" "}
                  <span className="text-muted-foreground">
                    Love the color palette! The primary aubergine works
                    perfectly.
                  </span>
                </p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  2 hours ago
                </p>
              </div>
            </div>
            <AnimatePresence>
              {commentVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2"
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold">
                    A
                  </div>
                  <div>
                    <p className="text-[11px]">
                      <span className="font-medium">Alex</span>{" "}
                      <span className="text-muted-foreground">
                        Thanks! Updated the logo based on your feedback.
                      </span>
                    </p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      Just now
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Comment input */}
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={step === "complete" ? "Looks great, approved!" : ""}
              placeholder="Leave a comment..."
              className="h-7 flex-1 rounded-md border border-input bg-input/20 px-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-[10px] font-medium text-primary-foreground">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────

function Header({
  projectHovered,
  actionBtnRef,
}: {
  projectHovered: boolean;
  actionBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-3 py-2.5 sm:px-4 md:px-6">
      <div className="min-w-0">
        <p className="truncate text-[11px] text-muted-foreground">
          Good morning, Alex
        </p>
        <h2 className="truncate text-sm font-bold text-secondary-foreground">
          Acme Studio
        </h2>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button className="inline-flex h-7 items-center gap-1 rounded-md border border-transparent bg-secondary px-2 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
          <UserPlusIcon /> <span className="hidden sm:inline">Add Client</span>
        </button>
        <button
          ref={actionBtnRef}
          className={`inline-flex h-7 items-center gap-1 rounded-md border border-transparent bg-primary px-2.5 text-[11px] font-medium text-primary-foreground transition-all ${
            projectHovered ? "bg-primary/80 shadow-sm" : ""
          }`}
        >
          <PlusIcon /> <span>Create Project</span>
        </button>
      </div>
    </header>
  );
}

function ModalOverlay({
  modalOpen,
  inputFocused,
  typedText,
  submitHovered,
  title,
  inputRef,
  submitBtnRef,
}: {
  modalOpen: boolean;
  inputFocused: boolean;
  typedText: string;
  submitHovered: boolean;
  title: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  submitBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <AnimatePresence>
      {modalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", visualDuration: 0.3, bounce: 0.15 }}
            className="w-full max-w-[420px] rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Fill in the details below.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground">
                  Project Name
                </label>
                <input
                  ref={inputRef}
                  readOnly
                  value={typedText}
                  placeholder="Project Name"
                  className={`h-7 w-full rounded-md border bg-input/20 px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground ${
                    inputFocused
                      ? "border-ring ring-2 ring-ring/30"
                      : "border-input"
                  }`}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-foreground">
                  Project Description
                </label>
                <textarea
                  readOnly
                  placeholder="Project Description"
                  className="flex min-h-16 w-full resize-none rounded-md border border-input bg-input/20 px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-foreground">
                    Start Date
                  </label>
                  <input
                    readOnly
                    type="date"
                    className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-sm text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-foreground">
                    Due Date
                  </label>
                  <input
                    readOnly
                    type="date"
                    className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-sm text-foreground outline-none"
                  />
                </div>
              </div>
              <button
                ref={submitBtnRef}
                className={`mt-1 inline-flex h-7 items-center justify-center rounded-md border border-transparent bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-all ${submitHovered ? "bg-primary/80 shadow-sm" : ""}`}
              >
                Create Project
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReviewModal({
  modalOpen,
  inputFocused,
  typedText,
  submitHovered,
  inputRef,
  submitBtnRef,
}: {
  modalOpen: boolean;
  inputFocused: boolean;
  typedText: string;
  submitHovered: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  submitBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <AnimatePresence>
      {modalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", visualDuration: 0.3, bounce: 0.15 }}
            className="w-full max-w-[420px] rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-foreground">
              Review Deliverable
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Brand Guidelines v2.pdf
            </p>
            <div className="mt-4 rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-card ring-1 ring-foreground/10">
                  <FolderIcon />
                </div>
                <div>
                  <p className="text-[11px] font-medium">
                    Brand Guidelines v2.pdf
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    2.4 MB · Uploaded today
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-medium text-foreground">
                Comment
              </label>
              <textarea
                ref={inputRef}
                readOnly
                value={typedText}
                placeholder="Add a comment..."
                className={`flex min-h-16 w-full resize-none rounded-md border bg-input/20 px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground ${
                  inputFocused
                    ? "border-ring ring-2 ring-ring/30"
                    : "border-input"
                }`}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                ref={submitBtnRef}
                className={`inline-flex h-7 flex-1 items-center justify-center rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-all ${submitHovered ? "bg-primary/80 shadow-sm" : ""}`}
              >
                Approve
              </button>
              <button className="inline-flex h-7 items-center justify-center rounded-md border border-border bg-card px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-muted">
                Request Changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Cursor ─────────────────────────────────────────────

function AnimatedCursor({
  x,
  y,
  opacity,
  label,
  clicking,
}: {
  x: number;
  y: number;
  opacity: number;
  label?: string;
  clicking?: boolean;
}) {
  return (
    <motion.div
      animate={{ x, y, opacity, scale: clicking ? 0.85 : 1 }}
      transition={{
        x: { type: "spring", visualDuration: 0.45, bounce: 0.08 },
        y: { type: "spring", visualDuration: 0.45, bounce: 0.08 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.15 },
      }}
      className="pointer-events-none absolute left-0 top-0 z-30"
      aria-hidden="true"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="white"
        stroke="#1d1c1d"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}
      >
        <path d="M5 3l14 8-6.5 2L9 20z" />
      </svg>
      <AnimatePresence>
        {label && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-4 top-4 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] font-medium text-background shadow-md"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ClickRipple({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      initial={{ opacity: 0.5, scale: 0.3 }}
      animate={{ opacity: 0, scale: 2 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{ left: x, top: y }}
      className="pointer-events-none absolute z-30 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/50"
    />
  );
}

// ─── Main Component ─────────────────────────────────────

export function WorkflowDemo() {
  const [activeDemo, setActiveDemo] = useState<DemoId>("create");
  const [step, setStep] = useState<Step>("idle");
  const [typedText, setTypedText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [projectHovered, setProjectHovered] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);

  // Container the cursor's coordinates are measured relative to.
  const demoContainerRef = useRef<HTMLDivElement>(null);

  // Targets the cursor visits — attached to the real DOM elements via
  // props, so their position is always accurate, including on resize
  // and across breakpoints.
  const actionBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Returns an element's box relative to demoContainerRef, not the
  // viewport — required since the cursor is absolutely positioned
  // inside that container.
  const getRelativeRect = useCallback(
    (ref: React.RefObject<HTMLElement | null>) => {
      if (!ref.current || !demoContainerRef.current) {
        return { left: 0, top: 0, width: 0, height: 0 };
      }
      const elRect = ref.current.getBoundingClientRect();
      const containerRect = demoContainerRef.current.getBoundingClientRect();
      return {
        left: elRect.left - containerRect.left,
        top: elRect.top - containerRect.top,
        width: elRect.width,
        height: elRect.height,
      };
    },
    [],
  );

  const getElCenter = useCallback(
    (ref: React.RefObject<HTMLElement | null>) => {
      const r = getRelativeRect(ref);
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    [getRelativeRect],
  );

  const resetDemo = useCallback(() => {
    setStep("idle");
    setTypedText("");
    setModalOpen(false);
    setInputFocused(false);
    setProjectHovered(false);
    setSubmitHovered(false);

    const demos: DemoId[] = ["create", "review", "portal"];
    const nextIdx = (demos.indexOf(activeDemo) + 1) % demos.length;
    setActiveDemo(demos[nextIdx]);

    setTimeout(() => setStep("cursor-appear"), 600);
  }, [activeDemo]);

  useEffect(() => {
    const t = setTimeout(() => setStep("cursor-appear"), 1200);
    return () => clearTimeout(t);
  }, []);

  // Step progression
  useEffect(() => {
    if (step === "idle") return;

    const schedule = (fn: () => void, ms: number) => {
      resetTimerRef.current = setTimeout(fn, ms);
    };

    const isPortal = activeDemo === "portal";

    switch (step) {
      case "cursor-appear":
        if (isPortal) {
          schedule(() => setStep("result"), 400);
        } else {
          schedule(() => setStep("move-to-action"), 400);
        }
        break;
      case "move-to-action":
        schedule(() => setStep("hover-action"), 900);
        break;
      case "hover-action":
        setProjectHovered(true);
        schedule(() => setStep("click-action"), 700);
        break;
      case "click-action":
        schedule(() => {
          setModalOpen(true);
          setStep("modal-open");
        }, 400);
        break;
      case "modal-open":
        schedule(() => setStep("move-to-input"), 700);
        break;
      case "move-to-input":
        schedule(() => {
          setInputFocused(true);
          setStep("focus-input");
        }, 600);
        break;
      case "focus-input":
        schedule(() => setStep("typing"), 300);
        break;
      case "typing":
        break;
      case "move-to-submit":
        schedule(() => setStep("hover-submit"), 700);
        break;
      case "hover-submit":
        setSubmitHovered(true);
        schedule(() => setStep("click-submit"), 700);
        break;
      case "click-submit":
        schedule(() => {
          setModalOpen(false);
          setInputFocused(false);
          setProjectHovered(false);
          setSubmitHovered(false);
          setStep("modal-close");
        }, 300);
        break;
      case "modal-close":
        schedule(() => setStep("result"), 500);
        break;
      case "result":
        schedule(() => setStep("complete"), 2000);
        break;
      case "complete":
        schedule(() => resetDemo(), 3000);
        break;
    }

    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [step, activeDemo, resetDemo]);

  // Typing animation
  useEffect(() => {
    if (step !== "typing") return;
    const target =
      activeDemo === "review" ? "Great work on this!" : "Website Redesign";
    if (typedText.length >= target.length) {
      setTimeout(() => setStep("move-to-submit"), 400);
      return;
    }
    const t = setTimeout(
      () => setTypedText(target.slice(0, typedText.length + 1)),
      TYPING_SPEED,
    );
    return () => clearTimeout(t);
  }, [step, typedText, activeDemo]);

  // Cursor position — always derived from the real, currently-rendered
  // DOM elements, relative to the demo container.
  const cursorTarget = (() => {
    switch (step) {
      case "cursor-appear":
        return { x: -20, y: -20, opacity: 0 };
      case "move-to-action":
      case "hover-action":
      case "click-action": {
        const p = getElCenter(actionBtnRef);
        return { x: p.x, y: p.y, opacity: 1 };
      }
      case "modal-open":
      case "move-to-input":
      case "focus-input":
      case "typing": {
        if (!modalOpen) return { x: -20, y: -20, opacity: 0 };
        const r = getRelativeRect(inputRef);
        const textOffset = Math.min(
          typedText.length * 6.2,
          Math.max(r.width - 24, 0),
        );
        return {
          x: r.left + 12 + textOffset,
          y: r.top + r.height / 2,
          opacity: 1,
        };
      }
      case "move-to-submit":
      case "hover-submit":
      case "click-submit": {
        if (!modalOpen) return { x: -20, y: -20, opacity: 0 };
        const p = getElCenter(submitBtnRef);
        return { x: p.x, y: p.y, opacity: 1 };
      }
      default:
        return { x: -20, y: -20, opacity: 0 };
    }
  })();

  const cursorLabel =
    step === "hover-action" || step === "hover-submit" ? "Click" : undefined;
  const cursorClicking = step === "click-action" || step === "click-submit";
  const showRipple = cursorClicking && activeDemo !== "portal";

  return (
    <div className="w-full">
      {/* Demo tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5 px-2">
        {DEMOS.map((demo) => (
          <button
            key={demo.id}
            onClick={() => {
              if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
              setActiveDemo(demo.id);
              setStep("idle");
              setTypedText("");
              setModalOpen(false);
              setInputFocused(false);
              setProjectHovered(false);
              setSubmitHovered(false);
              setTimeout(() => setStep("cursor-appear"), 400);
            }}
            className={`rounded-lg px-2.5 py-1.5 text-[10px] sm:text-[11px] font-medium transition-all ${
              activeDemo === demo.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {demo.label}
          </button>
        ))}
      </div>

      {/* Demo description */}
      <p className="mb-4 text-center text-[11px] text-muted-foreground">
        {DEMOS.find((d) => d.id === activeDemo)?.description}
      </p>

      {/* Demo container */}
      <div
        ref={demoContainerRef}
        className="relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg"
      >
        <div className="flex h-[420px] sm:h-[440px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDemo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 overflow-hidden"
            >
              {activeDemo === "create" && (
                <CreateProjectDemo
                  step={step}
                  typedText={typedText}
                  inputFocused={inputFocused}
                  projectHovered={projectHovered}
                  submitHovered={submitHovered}
                  modalOpen={modalOpen}
                  actionBtnRef={actionBtnRef}
                  inputRef={inputRef}
                  submitBtnRef={submitBtnRef}
                />
              )}
              {activeDemo === "review" && (
                <ClientReviewDemo
                  step={step}
                  modalOpen={modalOpen}
                  inputFocused={inputFocused}
                  typedText={typedText}
                  submitHovered={submitHovered}
                  projectHovered={projectHovered}
                  actionBtnRef={actionBtnRef}
                  inputRef={inputRef}
                  submitBtnRef={submitBtnRef}
                />
              )}
              {activeDemo === "portal" && <PortalDemo step={step} />}
            </motion.div>
          </AnimatePresence>

          {/* Animated cursor + click feedback */}
          {activeDemo !== "portal" && (
            <>
              <AnimatedCursor
                x={cursorTarget.x}
                y={cursorTarget.y}
                opacity={cursorTarget.opacity}
                label={cursorLabel}
                clicking={cursorClicking}
              />
              <AnimatePresence>
                {showRipple && (
                  <ClickRipple
                    key={step}
                    x={cursorTarget.x}
                    y={cursorTarget.y}
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
