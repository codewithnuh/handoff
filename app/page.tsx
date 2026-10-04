import { Navbar } from "@/components/globals/nav";
import { FinalCTA } from "@/components/landing-page/cta";
import { FeaturesSection } from "@/components/landing-page/features";
import { Footer } from "@/components/landing-page/footer";
import { Hero } from "@/components/landing-page/hero";
import { Pricing } from "@/components/landing-page/pricing";
import { ProblemSection } from "@/components/landing-page/problems";
import { HowItWorks } from "@/components/landing-page/how-it-works";
import { Comparison } from "@/components/landing-page/comparison";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <FeaturesSection />
      <Comparison />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
