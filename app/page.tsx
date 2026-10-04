import type { Metadata } from "next";
import { Navbar } from "@/components/globals/nav";
import { FinalCTA } from "@/components/landing-page/cta";
import { FeaturesSection } from "@/components/landing-page/features";
import { Footer } from "@/components/landing-page/footer";
import { Hero } from "@/components/landing-page/hero";
import { Pricing } from "@/components/landing-page/pricing";
import { ProblemSection } from "@/components/landing-page/problems";
import { HowItWorks } from "@/components/landing-page/how-it-works";
import { Comparison } from "@/components/landing-page/comparison";
import { FrequentlyAskedQuestions } from "@/components/landing-page/faq";
import { createPageMetadata, creatorProfiles, siteDescription, siteUrl } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Freelance Project Management Software",
  description: siteDescription,
  path: "/",
});

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Handoff",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
        width: 1280,
        height: 1280,
      },
      sameAs: ["https://github.com/codewithnuh/handoff"],
      founder: { "@id": `${siteUrl}/#creator` },
    },
    {
      "@type": "Person",
      "@id": `${siteUrl}/#creator`,
      name: "Noor ul Hassan",
      url: "https://noorulhassan.com",
      sameAs: creatorProfiles.map(({ url }) => url),
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "Handoff",
      url: siteUrl,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en",
    },
  ],
};

export default function Home() {
  const structuredDataJson = JSON.stringify(structuredData).replace(/</g, "\\u003c");

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredDataJson }}
      />
      <Navbar />
      <Hero />
      <Comparison />
      <ProblemSection />
      <HowItWorks />
      <FeaturesSection />
      <Pricing />
      <FrequentlyAskedQuestions />
      <FinalCTA />
      <Footer />
    </main>
  );
}
