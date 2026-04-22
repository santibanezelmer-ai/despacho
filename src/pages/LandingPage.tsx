import LandingHeader from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import LeadCaptureSection from '@/components/landing/LeadCaptureSection';
import ProblemSolutionSection from '@/components/landing/ProblemSolutionSection';
import ModulesSection from '@/components/landing/ModulesSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import StepsSection from '@/components/landing/StepsSection';
import PricingSection from '@/components/landing/PricingSection';
import SecuritySection from '@/components/landing/SecuritySection';
import FinalCTASection from '@/components/landing/FinalCTASection';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingHeader />
      <HeroSection />
      <LeadCaptureSection />
      <ProblemSolutionSection />
      <ModulesSection />
      <TestimonialsSection />
      <StepsSection />
      <PricingSection />
      <SecuritySection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
}
