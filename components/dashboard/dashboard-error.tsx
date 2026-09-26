"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/presentational/error-panel";

/** Hook-based button so the class boundary can navigate via the App Router */
function SignInButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.push("/login")}
      className="mt-3"
    >
      Sign in
    </Button>
  );
}

interface DashboardErrorProps {
  children: React.ReactNode;
}

interface DashboardErrorState {
  hasError: boolean;
  error: Error | null;
}

export class DashboardError extends React.Component<
  DashboardErrorProps,
  DashboardErrorState
> {
  constructor(props: DashboardErrorProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): DashboardErrorState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard section error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isNetworkError =
        this.state.error?.message?.toLowerCase().includes("network") ||
        this.state.error?.message?.toLowerCase().includes("fetch");

      const isAuthError =
        this.state.error?.message?.toLowerCase().includes("unauthorized") ||
        this.state.error?.message?.toLowerCase().includes("session");

      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ErrorPanel
              key={i}
              error={this.state.error ?? new Error("Unknown error")}
              logLabel="Dashboard section error:"
              title={isAuthError ? "Session expired" : "Error loading data"}
              description={
                isAuthError
                  ? "Your session has expired. Please sign in again."
                  : isNetworkError
                    ? "A network error occurred. Check your connection and try again."
                    : this.state.error?.message ||
                      "An unexpected error occurred."
              }
              contentClassName="space-y-3"
              actions={isAuthError ? <SignInButton /> : undefined}
              retry={
                isAuthError
                  ? undefined
                  : () => {
                      this.setState({ hasError: false, error: null });
                      window.location.reload();
                    }
              }
            />
          ))}
        </div>
      );
    }

    return this.props.children;
  }
}
