import { Container } from "@/components/globals/container";
import { Navbar } from "@/components/globals/nav";
import { FinalCTA } from "@/components/landing-page/cta";
import { Demo } from "@/components/landing-page/demo";
import { FeaturesSection } from "@/components/landing-page/features";
import { Footer } from "@/components/landing-page/footer";
import { Hero } from "@/components/landing-page/hero";
import { Pricing } from "@/components/landing-page/pricing";
import { ProblemSection } from "@/components/landing-page/problems";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Container leftBorder rightBorder>
        <Hero />
        <Demo />
        <ProblemSection />
        <FeaturesSection />
        <Pricing />
        <FinalCTA />
      </Container>
      <Footer />
    </main>
  );
}
