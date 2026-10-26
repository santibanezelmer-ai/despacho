import { Suspense, lazy } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import LeadCaptureSection from '@/components/landing/LeadCaptureSection';
import LandingFooter from '@/components/landing/LandingFooter';
import StickyCTA from '@/components/landing/StickyCTA';
import LandingSEO from '@/components/landing/LandingSEO';
import PartnersCarousel from '@/components/landing/PartnersCarousel';

const ProblemSolutionSection = lazy(() => import('@/components/landing/ProblemSolutionSection'));
const ComparisonSection = lazy(() => import('@/components/landing/ComparisonSection'));
const ModulesSection = lazy(() => import('@/components/landing/ModulesSection'));
const ShowcaseSection = lazy(() => import('@/components/landing/ShowcaseSection'));
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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingSEO />
      <LandingHeader />
      <HeroSection />
      <PartnersCarousel />
      <LeadCaptureSection />
      <Suspense fallback={<LazyFallback />}>
        <ProblemSolutionSection />
        <WhyOperixSection />
        <RadioComplementSection />
        <ComparisonSection />
        <ModulesSection />
        <ShowcaseSection />
        <StepsSection />
        <PricingSection />
        <FAQSection />
        <SecuritySection />
        <ContactFormSection />
        <FinalCTASection />
      </Suspense>
      <LandingFooter />
      <StickyCTA />
    </div>
  );
}
