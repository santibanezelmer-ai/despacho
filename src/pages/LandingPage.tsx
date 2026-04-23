import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import LeadCaptureSection from '@/components/landing/LeadCaptureSection';
import StatsSection from '@/components/landing/StatsSection';
import ProblemSolutionSection from '@/components/landing/ProblemSolutionSection';
import ModulesSection from '@/components/landing/ModulesSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import StepsSection from '@/components/landing/StepsSection';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import SecuritySection from '@/components/landing/SecuritySection';
import FinalCTASection from '@/components/landing/FinalCTASection';
import LandingFooter from '@/components/landing/LandingFooter';
import StickyCTA from '@/components/landing/StickyCTA';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingHeader />
      <HeroSection />
      <LeadCaptureSection />
      <StatsSection />
      <ProblemSolutionSection />
      <ModulesSection />
      <TestimonialsSection />
      <StepsSection />
      <PricingSection />
      <FAQSection />
      <SecuritySection />
      <FinalCTASection />
      <LandingFooter />
      <StickyCTA />
    </div>
  );
}
