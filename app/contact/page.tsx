import { Navbar } from "@/components/globals/nav";
import { Footer } from "@/components/landing-page/footer";
import { Container } from "@/components/globals/container";
import { Card, CardContent } from "@/components/ui/card";
import { IconMail, IconBrandGithub } from "@tabler/icons-react";
import { ContactForm } from "@/components/contact/contact-form";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Contact & Support",
  description:
    "Contact Handoff for help with the open-source freelance project management app, client portal, account setup, or product feedback.",
  path: "/contact",
});

const SUPPORT_EMAIL = "support@handoff.noorulhassan.com";
const GITHUB_URL = "https://github.com/codewithnuh/handoff/issues";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Container>
        <div className="mx-auto max-w-3xl py-16 sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Contact & Support
          </h1>
          <p className="mt-3 text-muted-foreground">
            Have a question, need help, or want to share feedback? We&apos;d
            love to hear from you.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <ContactForm />
          </div>

          {/* Other Channels */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <IconMail className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    For general inquiries and support
                  </p>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="mt-2 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <IconBrandGithub className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">GitHub</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Report bugs and request features
                  </p>
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Open an issue
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </Container>
      <Footer />
    </main>
  );
}
