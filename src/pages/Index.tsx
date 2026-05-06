import { useState } from "react";
import { useDirection } from "@/hooks/useDirection";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { WhySection } from "@/components/site/WhySection";
import { Tracks } from "@/components/site/Tracks";
import { CheckoutSection } from "@/components/site/CheckoutSection";
import { TrustSection } from "@/components/site/TrustSection";
import { Faq } from "@/components/site/Faq";
import { Footer } from "@/components/site/Footer";
import { StickyCta } from "@/components/site/StickyCta";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import type { TrackSelection } from "@/components/site/TrackCard";

const Index = () => {
  useDirection();
  const [selection, setSelection] = useState<TrackSelection | null>(null);

  const handleSelect = (sel: TrackSelection) => {
    setSelection(sel);
    setTimeout(() => {
      document
        .getElementById("checkout")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main>
        <Hero />
        <WhySection />
        <Tracks onSelect={handleSelect} />
        <CheckoutSection selection={selection} onChangeSelection={setSelection} />
        <TrustSection />
        <Faq />
      </main>
      <Footer />
      <StickyCta />
      <WhatsAppFloat />
    </div>
  );
};

export default Index;
