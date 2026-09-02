import Link from "next/link";
import { Container } from "@/components/globals/container";
import { Navbar } from "@/components/globals/nav";
import { Footer } from "@/components/landing-page/footer";

type LegalPageProps = {
  title: string;
  description?: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalPage({
  title,
  description,
  lastUpdated,
  children,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Container>
        <article className="mx-auto max-w-3xl py-16 sm:py-20">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-muted-foreground">{description}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-sm leading-7 text-muted-foreground [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_ul]:ml-5 [&_ul]:space-y-2 [&_li]:pl-1">
            {children}
          </div>

          <div className="mt-12 border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              Questions about this policy?{" "}
              <Link
                href="/contact"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Contact us
              </Link>
            </p>
          </div>
        </article>
      </Container>
      <Footer />
    </main>
  );
}
