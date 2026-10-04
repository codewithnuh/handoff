import type { Metadata } from "next";

const fallbackSiteUrl = "https://handoff-six-psi.vercel.app";

export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_APP_URL || fallbackSiteUrl,
).origin;

export const siteDescription =
  "Manage freelance projects, clients, deliverables, feedback, and invoices in one workspace. Share a private client portal for clear updates and approvals.";

export const creatorProfiles = [
  { name: "X", url: "https://x.com/codewithnuh" },
  { name: "LinkedIn", url: "https://www.linkedin.com/in/codewithnuh" },
  { name: "GitHub", url: "https://github.com/codewithnuh" },
  { name: "Peerlist", url: "https://peerlist.io/noorulhassan" },
] as const;

type PageMetadataInput = {
  title: string;
  description: string;
  path: `/${string}`;
};

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataInput): Metadata {
  const fullTitle = `${title} | Handoff`;
  const image = {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: "Handoff freelance project management and client portal",
  };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: path,
      siteName: "Handoff",
      title: fullTitle,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      site: "@codewithnuh",
      creator: "@codewithnuh",
      title: fullTitle,
      description,
      images: [image.url],
    },
  };
}
