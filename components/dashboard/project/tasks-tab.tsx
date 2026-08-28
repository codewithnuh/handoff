"use client";

/**
 * TasksTab — minimal kanban board (To Do / In Progress / Done).
 *
 * Built for freelancer speed: type a title + Enter to add, drag between
 * columns (or click the check) to move, hover for delete. dnd-kit powers
 * the drag-and-drop; every settled drop persists through `reorderTasks`.
 */

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { Task } from "@/app/generated/prisma/client";
import { createTask, deleteTask, reorderTasks } from "@/lib/actions/task";

type Status = "TODO" | "IN_PROGRESS" | "DONE";

const COLUMNS: { key: Status; label: string }[] = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE", label: "Done" },
];

type Columns = Record<Status, Task[]>;

function groupTasks(tasks: Task[]): Columns {
  const columns: Columns = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const status of COLUMNS.map((c) => c.key)) {
    columns[status] = tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
  }
  return columns;
}

export function TasksTab({
  projectId,
  initialTasks,
  canManage,
}: {
  projectId: string;
  initialTasks: Task[];
  canManage: boolean;
}) {
  const [columns, setColumns] = useState<Columns>(() =>
    groupTasks(initialTasks),
  );
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newTitles, setNewTitles] = useState<Record<Status, string>>({
    TODO: "",
    IN_PROGRESS: "",
    DONE: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const totalCount =
    columns.TODO.length + columns.IN_PROGRESS.length + columns.DONE.length;

  async function handleAdd(status: Status) {
    const title = newTitles[status].trim();
    if (!title || !canManage) return;
    try {
      const result = await createTask({ projectId, title, status });
      if (!result.success) {
        toast.add({
          type: "error",
          title: "Couldn't add task",
          description: result.message,
        });
        return;
      }
      // New tasks land at the bottom of the column they were added to
      setColumns((prev) => ({
        ...prev,
        [status]: [...prev[status], result.data],
      }));
      setNewTitles((prev) => ({ ...prev, [status]: "" }));
    } catch {
      toast.add({ type: "error", title: "Something went wrong" });
    }
  }

  async function handleDelete(taskId: string) {
    if (!canManage) return;
    const prev = columns;
    setColumns((cols) => ({
      TODO: cols.TODO.filter((t) => t.id !== taskId),
      IN_PROGRESS: cols.IN_PROGRESS.filter((t) => t.id !== taskId),
      DONE: cols.DONE.filter((t) => t.id !== taskId),
    }));
    const result = await deleteTask({ id: taskId });
    if (!result.success) {
      setColumns(prev);
      toast.add({
        type: "error",
        title: "Couldn't delete task",
        description: result.message,
      });
    }
  }

  /** Quick toggle without dragging — freelancer speed matters. */
  async function handleToggleDone(task: Task) {
    if (!canManage) return;
    const target: Status = task.status === "DONE" ? "TODO" : "DONE";
    void persistMove(task, target, Number.MAX_SAFE_INTEGER);
  }

  function persistMove(task: Task, status: Status, position: number) {
    const before = columns;
    const sourceStatus = task.status;

    // Optimistically move the card and renormalize both columns
    const next: Columns = {
      TODO: columns.TODO.filter((t) => t.id !== task.id),
      IN_PROGRESS: columns.IN_PROGRESS.filter((t) => t.id !== task.id),
      DONE: columns.DONE.filter((t) => t.id !== task.id),
    };
    next[status] = [...next[status]];
    const idx = Math.min(position, next[status].length);
    next[status].splice(idx, 0, { ...task, status });
    next[status] = next[status].map((t, i) => ({ ...t, position: i }));
    if (next[sourceStatus]) {
      next[sourceStatus] = next[sourceStatus].map((t, i) => ({
        ...t,
        position: i,
      }));
    }
    setColumns(next);

    void (async () => {
      // Persist the full ordering of every affected column so positions
      // stay dense (no drifting duplicates over time).
      const updates = [
        ...(sourceStatus !== status
          ? next[sourceStatus].map((t, i) => ({
              id: t.id,
              status: sourceStatus,
              position: i,
            }))
          : []),
        ...next[status].map((t, i) => ({
          id: t.id,
          status,
          position: i,
        })),
      ];

      const result = await reorderTasks({ projectId, items: updates });
      if (!result.success) {
        setColumns(before);
        toast.add({
          type: "error",
          title: "Couldn't save the board",
          description: result.message,
        });
      }
    })();
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    const all = [...columns.TODO, ...columns.IN_PROGRESS, ...columns.DONE];
    setActiveTask(all.find((t) => t.id === id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !canManage) return;

    const activeId = active.id as string;
    const activeStatus = findStatus(activeId);
    if (!activeStatus) return;

    // Determine target column from the dropped-over id
    const overId = String(over.id);
    const overStatus = (COLUMNS.map((c) => c.key) as string[]).includes(overId)
      ? (overId as Status)
      : findStatus(overId);
    if (!overStatus) return;

    if (activeStatus === overStatus && activeId === overId) return;

    const source = [...columns[activeStatus]];
    const activeIndex = source.findIndex((t) => t.id === activeId);
    const task = source[activeIndex];
    if (!task) return;

    let next: Columns;

    if (activeStatus === overStatus) {
      const overIndex = source.findIndex((t) => t.id === overId);
      const reordered = arrayMove(source, activeIndex, overIndex);
      next = { ...columns, [overStatus]: reordered };
    } else {
      const dest = [...columns[overStatus]];
      const overIndex = dest.findIndex((t) => t.id === overId);
      const insertAt = overIndex === -1 ? dest.length : overIndex;
      dest.splice(insertAt, 0, { ...task, status: overStatus });
      next = {
        ...columns,
        [activeStatus]: source.filter((t) => t.id !== activeId),
        [overStatus]: dest,
      };
    }

    // Persist ordering of both affected columns
    const updates = [
      ...next[activeStatus].map((t, i) => ({
        id: t.id,
        status: activeStatus,
        position: i,
      })),
      ...(activeStatus !== overStatus
        ? next[overStatus].map((t, i) => ({
            id: t.id,
            status: overStatus,
            position: i,
          }))
        : []),
    ];

    const before = columns;
    setColumns(next);
    void (async () => {
      const result = await reorderTasks({ projectId, items: updates });
      if (!result.success) {
        setColumns(before);
        toast.add({
          type: "error",
          title: "Couldn't save the board",
          description: result.message,
        });
      }
    })();
  }

  function findStatus(taskId: string): Status | null {
    if (columns.TODO.some((t) => t.id === taskId)) return "TODO";
    if (columns.IN_PROGRESS.some((t) => t.id === taskId)) return "IN_PROGRESS";
    if (columns.DONE.some((t) => t.id === taskId)) return "DONE";
    return null;
  }

  const doneCount = columns.DONE.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {totalCount} task{totalCount === 1 ? "" : "s"} · {doneCount} done
        </span>
        {!canManage && <span>view-only</span>}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map(({ key, label }) => (
            <BoardColumn
              key={key}
              status={key}
              label={label}
              tasks={columns[key]}
              canManage={canManage}
              newTitle={newTitles[key]}
              onNewTitleChange={(v) =>
                setNewTitles((prev) => ({ ...prev, [key]: v }))
              }
              onAdd={() => void handleAdd(key)}
              onDelete={handleDelete}
              onToggleDone={handleToggleDone}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rounded-md border border-border bg-card p-2.5 text-xs shadow-md">
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ──────────────────────────────────────────────
// Column
// ──────────────────────────────────────────────

function BoardColumn({
  status,
  label,
  tasks,
  canManage,
  newTitle,
  onNewTitleChange,
  onAdd,
  onDelete,
  onToggleDone,
}: {
  status: Status;
  label: string;
  tasks: Task[];
  canManage: boolean;
  newTitle: string;
  onNewTitleChange: (v: string) => void;
  onAdd: () => void;
  onDelete: (taskId: string) => void;
  onToggleDone: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-muted/30 p-3 space-y-2 transition-colors ${
        isOver ? "border-primary/50 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </div>

      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAdd();
          }}
        >
          <Input
            value={newTitle}
            onChange={(e) => onNewTitleChange(e.target.value)}
            placeholder="Add a task…"
            className="h-8 text-xs bg-background"
          />
        </form>
      )}

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5 min-h-[40px]">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canManage={canManage}
              onDelete={() => onDelete(task.id)}
              onToggleDone={() => onToggleDone(task)}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-3 italic">
              Drop tasks here
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ──────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────

function TaskCard({
  task,
  canManage,
  onDelete,
  onToggleDone,
}: {
  task: Task;
  canManage: boolean;
  onDelete: () => void;
  onToggleDone: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !canManage });

  const done = task.status === "DONE";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group flex items-start gap-2 rounded-md border border-border bg-background p-2.5 text-xs ${
        isDragging ? "opacity-40" : ""
      } ${!canManage ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      {canManage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          className={`mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border ${
            done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary"
          }`}
        >
          {done && <Check className="size-2.5" />}
        </button>
      )}

      <span
        className={`flex-1 min-w-0 break-words ${
          done ? "line-through text-muted-foreground" : ""
        }`}
        {...attributes}
        {...listeners}
      >
        {task.title}
      </span>

      {canManage && (
        <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            aria-label="Delete task"
          >
            <Trash2 className="size-3 text-destructive" />
          </Button>
          <GripVertical
            className="size-3 text-muted-foreground/50 cursor-grab"
            {...attributes}
            {...listeners}
          />
        </span>
      )}
    </div>
  );
}
