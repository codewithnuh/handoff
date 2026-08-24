"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { IconAlertOctagon } from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
            <Card className="shadow-xs" key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-destructive">
                  {isAuthError ? "Session expired" : "Error loading data"}
                </CardTitle>
                <IconAlertOctagon className="size-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {isAuthError
                    ? "Your session has expired. Please sign in again."
                    : isNetworkError
                      ? "A network error occurred. Check your connection and try again."
                      : this.state.error?.message ||
                        "An unexpected error occurred."}
                </p>
                {isAuthError ? (
                  <SignInButton />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      this.setState({ hasError: false, error: null });
                      window.location.reload();
                    }}
                    className="mt-3"
                  >
                    Try again
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return this.props.children;
  }
}
