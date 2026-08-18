import { Container } from "@/components/globals/container";
import { FinalCTA } from "@/components/landing-page/cta";
import { Demo } from "@/components/landing-page/demo";
import { FeaturesSection } from "@/components/landing-page/features";
import { Hero } from "@/components/landing-page/hero";
import { ProblemSection } from "@/components/landing-page/problems";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Container leftBorder rightBorder>
        <Hero />
        <Demo />
        <ProblemSection />
        <FeaturesSection />
        <FinalCTA />
      </Container>
    </main>
  );
}
