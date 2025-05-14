import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturesSection } from "@/components/home/features-section";
import { MeetFlappySection } from "@/components/home/meet-flappy-section";
import { JournalDemoSection } from "@/components/home/journal-demo-section";
import { ChatPreviewSection } from "@/components/home/chat-preview-section";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { EmailPreviewSection } from "@/components/home/email-preview-section";
import { PricingSection } from "@/components/home/pricing-section";
import { CTASection } from "@/components/home/cta-section";
import { Helmet } from 'react-helmet';

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>Featherweight - Your AI Email Companion & Journal</title>
        <meta name="description" content="Journal with Flappy, an ancient cosmic pelican who sends daily inspiration and helps you maintain your personal journal through email." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <HeroSection />
          <FeaturesSection />
          <MeetFlappySection />
          <JournalDemoSection />
          <ChatPreviewSection />
          <TestimonialsSection />
          <EmailPreviewSection />
          <PricingSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
}
