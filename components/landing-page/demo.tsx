import { Badge } from "../ui/badge";

const TASK = {
  visibility: "Private Link",
  title: "Redesign onboarding flow",
  description:
    "Improve the onboarding experience and reduce friction for new users.",
  status: "In Progress",
  progress: 68,
  completed: 8,
  total: 12,
  dueDate: "Aug 24",
  tasks: [
    { title: "Audit existing onboarding", completed: true },
    { title: "Create user flow", completed: true },
    { title: "Design welcome screen", completed: true },
    { title: "Design profile setup", completed: true },
    { title: "Add progress indicator", completed: true },
    { title: "Mobile responsive states", completed: true },
    { title: "Empty & error states", completed: true },
    { title: "Accessibility review", completed: true },
    { title: "Implement onboarding UI", completed: false },
    { title: "Connect API integration", completed: false },
    { title: "QA & bug fixes", completed: false },
    { title: "Final review", completed: false },
  ],
};

export const Demo = () => {
  return (
    <div id="demo" className="scroll-mt-20 w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="px-4 sm:px-6">
        {/* Header */}
        <header className="border-b py-5">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              {/* Meta */}
              <div className="flex min-w-1 flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {TASK.visibility}
                </span>

                <span
                  aria-hidden="true"
                  className="hidden size-1 shrink-0 rounded-full bg-muted-foreground/40 xs:block"
                />

                <span className="text-xs text-muted-foreground">
                  Due {TASK.dueDate}
                </span>
              </div>

              {/* Title */}
              <h3 className="mt-2 break-words font-heading text-base font-semibold leading-snug tracking-tight sm:text-lg">
                {TASK.title}
              </h3>

              {/* Description */}
              <p className="mt-1.5 max-w-xl text-sm leading-5 text-muted-foreground">
                {TASK.description}
              </p>
            </div>

            {/* Status */}
            <Badge
              variant="secondary"
              className="w-fit shrink-0 gap-2 rounded-full px-3 py-1 text-xs"
            >
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>

              <span className="whitespace-nowrap">{TASK.status}</span>
            </Badge>
          </div>
        </header>

        {/* Progress */}
        <section aria-label="Task progress" className="border-b py-5">
          <div className="flex min-w-0 items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Overall progress</p>

              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {TASK.completed} of {TASK.total} tasks completed
              </p>
            </div>

            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {TASK.progress}%
            </span>
          </div>

          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={TASK.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${TASK.progress}% complete`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${TASK.progress}%` }}
            />
          </div>
        </section>

        {/* Tasks */}
        <section className="py-4" aria-labelledby="tasks-heading">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p id="tasks-heading" className="text-sm font-medium">
              Tasks
            </p>

            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {TASK.completed}/{TASK.total}
            </span>
          </div>

          <div className="grid min-w-0 gap-1 sm:grid-cols-2 sm:gap-x-4">
            {TASK.tasks.map((task) => (
              <div
                key={task.title}
                className="flex min-w-0 items-start gap-2.5 rounded-md px-1.5 py-2 text-sm"
              >
                {/* Checkbox */}
                <div
                  className={`
                    mt-0.5 flex size-4 shrink-0 items-center justify-center
                    rounded-full border
                    ${
                      task.completed
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    }
                  `}
                >
                  {task.completed && (
                    <svg
                      viewBox="0 0 12 12"
                      aria-hidden="true"
                      className="size-2.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m2.5 6 2.2 2.2L9.5 3.5" />
                    </svg>
                  )}
                </div>

                {/* Task text */}
                <span
                  className={`min-w-0 break-words leading-5 ${
                    task.completed
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}
                >
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
