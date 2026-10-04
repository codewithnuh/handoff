import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Briefcase, ShieldCheck, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { validateTeamInvite } from "@/lib/actions/team";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { HandoffMark } from "@/components/brand/handoff-mark";

export const metadata = { title: "Join workspace — Handoff" };

function InviteFrame({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(228,242,34,0.07),transparent_68%)]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="group inline-flex items-center gap-2.5 rounded-md text-sm font-medium tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <HandoffMark size={30} />
          Handoff
        </Link>
        <Link href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Need help?</Link>
      </header>
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-5 pb-12 pt-5 sm:px-8 sm:pb-16">
        {children}
      </div>
    </main>
  );
}

function InvalidInvite({ reason }: { reason: string }) {
  return (
    <InviteFrame>
      <section className="mx-auto w-full max-w-lg rounded-xl border border-border bg-card p-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-10">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl border border-border bg-background text-muted-foreground">
          <Users aria-hidden="true" className="size-5" />
        </div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Workspace invitation</p>
        <h1 className="text-2xl font-medium tracking-tight">This invite can&apos;t be used</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{reason}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm text-foreground transition-colors hover:bg-accent">
            <ArrowLeft aria-hidden="true" className="size-4" /> Go to Handoff
          </Link>
          <Link href="/contact" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Get help <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </InviteFrame>
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

  let viewerEmail: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    viewerEmail = session?.user.email ?? null;
  } catch {
    viewerEmail = null;
  }

  const existingAccount = await db.user.findUnique({
    where: { email: state.email },
    select: { id: true },
  });
  const emailMatches = viewerEmail?.toLowerCase() === state.email.toLowerCase();

  return (
    <InviteFrame>
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative flex flex-col justify-between border-b border-border p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" /> You&apos;re invited
            </div>
            <p className="text-sm text-muted-foreground">Join the workspace</p>
            <h1 className="mt-2 max-w-md break-words text-3xl font-medium tracking-tight sm:text-4xl">{state.workspaceName}</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              Your projects, tasks, and client work will be ready in one shared workspace.
            </p>

            <div className="mt-8 space-y-3 rounded-lg border border-border bg-background/70 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Users aria-hidden="true" className="size-4" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Invitation sent to</p>
                  <p className="mt-1 break-all text-sm font-medium">{state.email}</p>
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Briefcase aria-hidden="true" className="size-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Project access</p>
                  <p className="mt-1 text-sm font-medium">
                    {state.projectNameCount > 0
                      ? `${state.projectNameCount} ${state.projectNameCount === 1 ? "project" : "projects"} assigned`
                      : "Workspace access"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-primary/80" />
            Your access is tied to the invited email and workspace permissions.
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Accept invitation</p>
            <h2 className="mt-2 text-xl font-medium tracking-tight">
              {viewerEmail
                ? emailMatches
                  ? "You’re ready to join"
                  : "Switch account to continue"
                : existingAccount
                  ? "Sign in to continue"
                  : "Set up your account"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {viewerEmail
                ? emailMatches
                  ? `Signed in as ${viewerEmail}. Accept to join ${state.workspaceName}.`
                  : `You’re signed in as ${viewerEmail}, but this invitation was sent to ${state.email}. Sign in with the invited email.`
                : existingAccount
                  ? "This email already has an account. Sign in with your existing password, then reopen this invitation."
                  : "Create your Handoff account with the email that received this invitation."}
            </p>
          </div>
          <AcceptInviteForm
            token={token}
            email={state.email}
            viewerEmail={viewerEmail}
            emailMatches={!!emailMatches}
            hasAccount={!!existingAccount}
          />
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            By joining, you agree to the <Link className="text-foreground underline underline-offset-4 hover:text-primary" href="/terms">Terms</Link> and acknowledge the <Link className="text-foreground underline underline-offset-4 hover:text-primary" href="/privacy">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </InviteFrame>
  );
}
