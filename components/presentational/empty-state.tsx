import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  size = "md",
  showIconCircle = true,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  size?: "md" | "lg";
  showIconCircle?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const container =
    size === "lg"
      ? "rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-16 text-center"
      : "rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12 text-center";
  const circle =
    size === "lg"
      ? "mx-auto flex size-12 items-center justify-center rounded-full bg-muted"
      : "mx-auto flex size-10 items-center justify-center rounded-full bg-muted";
  const heading =
    size === "lg" ? "mt-4 text-sm font-semibold" : "mt-3 text-sm font-semibold";
  const body =
    size === "lg"
      ? "mt-1 text-xs text-muted-foreground max-w-sm mx-auto"
      : "mt-1 text-xs text-muted-foreground";

  return (
    <div className={className ? `${container} ${className}` : container}>
      {showIconCircle ? <div className={circle}>{icon}</div> : icon}
      <h3 className={heading}>{title}</h3>
      <p className={body}>{description}</p>
      {children}
    </div>
  );
}
