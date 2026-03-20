import { Navigation } from '@/components/Navigation';
import { Hero } from '@/components/Hero';
import { FeatureCards } from '@/components/FeatureCards';
import { Footer } from '@/components/Footer';

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
