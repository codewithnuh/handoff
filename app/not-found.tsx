import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="shadow-xs w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Page not found</CardTitle>
          <AlertCircle className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-4xl font-bold tabular-nums text-muted-foreground">
              404
            </p>
            <p className="text-xs text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Go to dashboard
              </Button>
            </Link>
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm">
                View projects
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
