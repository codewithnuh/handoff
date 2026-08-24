import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconAlertTriangle, IconMail } from "@tabler/icons-react";

export default function PortalExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <Card className="shadow-xs w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-yellow-500/10 mb-2">
            <IconAlertTriangle className="size-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-base">Session Expired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Your portal session has expired or the invitation link is no longer
            valid. This can happen if:
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5 text-left max-w-xs mx-auto">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
              The invitation link has expired (links are valid for 7 days)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
              Your session was ended by the project owner
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
              You&apos;re using a previously used link
            </li>
          </ul>

          <div className="rounded-md bg-muted/50 p-4 flex items-start gap-3 text-left">
            <IconMail className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium">Need a new link?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ask the project owner to send you a new invitation link. Each
                link is unique to your email and project.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
