import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { validateTeamInvite } from "@/lib/actions/team";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export const metadata = { title: "Join workspace — Handoff" };

function InvalidInvite({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-3 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12">
        <h1 className="text-lg font-semibold">Invite unavailable</h1>
        <p className="text-sm text-muted-foreground">{reason}</p>
        <Link
          href="/"
          className="inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
}

export default async function AcceptTeamInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const state = await validateTeamInvite(token);

  if (state.status === "INVALID") {
    return <InvalidInvite reason={state.reason} />;
  }

  // Who's viewing? Signed-in users with a matching email can accept in one
  // click; everyone else sets a password here (no separate sign-up flow).
  let viewerEmail: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    viewerEmail = session?.user.email ?? null;
  } catch {
    viewerEmail = null;
  }

  // Boundary: does the invited email already belong to a Handoff account?
  // Existing users keep THEIR password — they sign in, never "set" a new one.
  const existingAccount = await db.user.findUnique({
    where: { email: state.email },
    select: { id: true },
  });

  const emailMatches =
    viewerEmail?.toLowerCase() === state.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Join {state.workspaceName}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            You were invited as{" "}
            <span className="font-medium text-foreground">{state.email}</span>
            {state.projectNameCount > 0 && (
              <> · {state.projectNameCount} project(s) assigned</>
            )}
          </p>
        </div>

        <AcceptInviteForm
          token={token}
          email={state.email}
          viewerEmail={viewerEmail}
          emailMatches={!!emailMatches}
          hasAccount={!!existingAccount}
        />
      </div>
    </div>
  );
}
