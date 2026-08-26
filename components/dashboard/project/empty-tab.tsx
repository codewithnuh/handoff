import type { ReactNode } from "react";

export function EmptyTab({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg space-y-4 border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
