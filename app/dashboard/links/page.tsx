import { LinksPage } from "@/components/dashboard/links-page";
import { listAllLinks } from "@/lib/actions/links";
import { Suspense } from "react";
import { LinksPageSkeleton } from "@/components/dashboard/links-page";

export const metadata = { title: "Links · Handoff" };

export default async function LinksRoute() {
  const result = await listAllLinks();

  if (!result.success) {
    return (
      <div className="p-4 md:p-6 max-w-5xl">
        <h1 className="text-2xl font-bold tracking-tight">Links</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {result.message}
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<LinksPageSkeleton />}>
      <LinksPage
        teamLinks={result.data.teamLinks}
        clientLinks={result.data.clientLinks}
      />
    </Suspense>
  );
}
