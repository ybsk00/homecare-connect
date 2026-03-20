import { Navigation } from '@/components/landing/Navigation';
import { Hero } from '@/components/landing/Hero';
import { FeatureCards } from '@/components/landing/FeatureCards';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <FeatureCards />
      </main>
      <Footer />
    </>
  );
}
