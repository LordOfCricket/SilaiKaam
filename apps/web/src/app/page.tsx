import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/features/homepage/components/Hero';
import { FitProblemSection } from '@/features/homepage/components/FitProblemSection';
import { HowItWorksSection } from '@/features/homepage/components/HowItWorksSection';
import { FittingOptionsSection } from '@/features/homepage/components/FittingOptionsSection';
import { MarketplaceSection } from '@/features/homepage/components/MarketplaceSection';
import { TrustSection } from '@/features/homepage/components/TrustSection';
import { FinalCtaSection } from '@/features/homepage/components/FinalCtaSection';

// Uses the site-wide metadata defined in app/layout.tsx — nothing here diverges from it.

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FitProblemSection />
        <HowItWorksSection />
        <FittingOptionsSection />
        <MarketplaceSection />
        <TrustSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </>
  );
}
