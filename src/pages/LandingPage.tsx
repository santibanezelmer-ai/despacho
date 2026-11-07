import { Suspense, lazy } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import LandingFooter from '@/components/landing/LandingFooter';
import StickyCTA from '@/components/landing/StickyCTA';
import LandingSEO from '@/components/landing/LandingSEO';
import PartnersCarousel from '@/components/landing/PartnersCarousel';
import LandingAssistant from '@/components/landing/LandingAssistant';
import ModulesSection from '@/components/landing/ModulesSection';

const ProblemSolutionSection = lazy(() => import('@/components/landing/ProblemSolutionSection'));
const ComparisonSection = lazy(() => import('@/components/landing/ComparisonSection'));
const WhyOperixSection = lazy(() => import('@/components/landing/WhyOperixSection'));
const StepsSection = lazy(() => import('@/components/landing/StepsSection'));
const RadioComplementSection = lazy(() => import('@/components/landing/RadioComplementSection'));
const PricingSection = lazy(() => import('@/components/landing/PricingSection'));
const FAQSection = lazy(() => import('@/components/landing/FAQSection'));
const SecuritySection = lazy(() => import('@/components/landing/SecuritySection'));
const ContactFormSection = lazy(() => import('@/components/landing/ContactFormSection'));
const FinalCTASection = lazy(() => import('@/components/landing/FinalCTASection'));

function LazyFallback() {
  return <div className="py-16" />;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-20 text-foreground sm:pb-0">
      <LandingSEO />
      <LandingHeader />
      <main>
        <HeroSection />
        <ModulesSection />
        <PartnersCarousel />
        <Suspense fallback={<LazyFallback />}>
          <ProblemSolutionSection />
          <WhyOperixSection />
          <RadioComplementSection />
          <ComparisonSection />
          <StepsSection />
          <PricingSection />
          <SecuritySection />
          <FAQSection />
          <ContactFormSection />
          <FinalCTASection />
        </Suspense>
      </main>
      <LandingFooter />
      <StickyCTA />
      <LandingAssistant />
    </div>
  );
}
