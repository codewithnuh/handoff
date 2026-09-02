import { Container } from "@/components/globals/container";
import { Navbar } from "@/components/globals/nav";
import { FinalCTA } from "@/components/landing-page/cta";
import { WorkflowDemo } from "@/components/landing-page/workflow-demo";
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
      <Container border>
        <Hero />
        {/* <WorkflowDemo /> */}
        <ProblemSection />
        <HowItWorks />
        <FeaturesSection />
        <Comparison />
        <Pricing />
        <FinalCTA />
      </Container>
      <Footer />
    </main>
  );
}
