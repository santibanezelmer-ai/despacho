import { Suspense, lazy } from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import LeadCaptureSection from '@/components/landing/LeadCaptureSection';
import LandingFooter from '@/components/landing/LandingFooter';
import StickyCTA from '@/components/landing/StickyCTA';
import LandingSEO from '@/components/landing/LandingSEO';

const StatsSection = lazy(() => import('@/components/landing/StatsSection'));
const ProblemSolutionSection = lazy(() => import('@/components/landing/ProblemSolutionSection'));
const ComparisonSection = lazy(() => import('@/components/landing/ComparisonSection'));
const ModulesSection = lazy(() => import('@/components/landing/ModulesSection'));
const ShowcaseSection = lazy(() => import('@/components/landing/ShowcaseSection'));
const TestimonialsSection = lazy(() => import('@/components/landing/TestimonialsSection'));
const StepsSection = lazy(() => import('@/components/landing/StepsSection'));
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
      <LeadCaptureSection />
      <Suspense fallback={<LazyFallback />}>
        <StatsSection />
        <ProblemSolutionSection />
        <ComparisonSection />
        <ModulesSection />
        <ShowcaseSection />
        <TestimonialsSection />
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
