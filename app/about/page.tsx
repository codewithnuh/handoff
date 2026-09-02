import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/globals/nav";
import { Footer } from "@/components/landing-page/footer";
import { Container } from "@/components/globals/container";
import { Button } from "@/components/ui/button";
import {
  IconBrandGithub,
  IconUsers,
  IconLock,
  IconRocket,
} from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Handoff — the open-source client and project management platform for freelancers.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Container>
        <div className="mx-auto max-w-3xl py-16 sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            About Handoff
          </h1>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Handoff was built to solve a simple problem: freelancers and
            creative teams waste too much time chasing status updates across
            email, Slack, and WhatsApp.
          </p>

          <div className="mt-10 space-y-10">
            <section>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <IconRocket className="size-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Our Mission</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Give freelancers and small agencies a single, clean workspace
                to manage clients, deliverables, and approvals — without the
                bloat of enterprise project management tools. One link. One
                place. Clear status.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <IconBrandGithub className="size-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Open Source</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Handoff is fully open source under the{" "}
                <a
                  href="https://github.com/codewithnuh/handoff/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  MIT License
                </a>
                . You can inspect the code, run it on your own infrastructure,
                and contribute to its development. Transparency isn&apos;t just
                a value — it&apos;s how the product is built.
              </p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href="https://github.com/codewithnuh/handoff"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on GitHub
                    </a>
                  }
                />
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <IconUsers className="size-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Who It&apos;s For</h2>
              </div>
              <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Freelancers</strong> who
                  want a simple way to share work, get approvals, and keep
                  clients informed without endless back-and-forth.
                </p>
                <p>
                  <strong className="text-foreground">Creative teams and studios</strong> juggling multiple clients who need visibility
                  into what&apos;s done, what&apos;s in progress, and
                  what&apos;s blocked.
                </p>
                <p>
                  <strong className="text-foreground">Agencies</strong> that
                  want a professional client portal without building one from
                  scratch.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <IconLock className="size-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Privacy & Security</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Your data is yours. Handoff uses encrypted connections, secure
                password storage, and role-based access controls. We never sell
                your data, and we never will. Read our full policies below.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/privacy">Privacy Policy</Link>}
                />
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/security">Security</Link>}
                />
              </div>
            </section>
          </div>

          {/* CTA */}
          <div className="mt-14 rounded-xl border border-border bg-muted/30 p-8 text-center">
            <h3 className="text-lg font-semibold">Ready to try Handoff?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Set up your first project in minutes. No credit card required.
            </p>
            <div className="mt-5">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/register">Get started free</Link>}
              />
            </div>
          </div>
        </div>
      </Container>
      <Footer />
    </main>
  );
}
