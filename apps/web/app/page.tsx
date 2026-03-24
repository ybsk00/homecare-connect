import { Navigation } from '@/components/landing/Navigation';
import { Hero } from '@/components/landing/Hero';
import { WhyHomeCare } from '@/components/landing/WhyHomeCare';
import { FeatureCards } from '@/components/landing/FeatureCards';
import { PlatformValue } from '@/components/landing/PlatformValue';
import { AgentShowcase } from '@/components/landing/AgentShowcase';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Stats } from '@/components/landing/Stats';
import { Testimonials } from '@/components/landing/Testimonials';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <WhyHomeCare />
        <PlatformValue />
        <AgentShowcase />
        <FeatureCards />
        <HowItWorks />
        <Stats />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
