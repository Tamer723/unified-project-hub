import { useState } from "react";
import { useDirection } from "@/hooks/useDirection";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { WhySection } from "@/components/site/WhySection";
import { Tracks } from "@/components/site/Tracks";
import { OrderForm } from "@/components/site/OrderForm";
import { TrustSection } from "@/components/site/TrustSection";
import { Faq } from "@/components/site/Faq";
import { Footer } from "@/components/site/Footer";
import { StickyCta } from "@/components/site/StickyCta";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import type { TrackSelection } from "@/components/site/TrackCard";

const Index = () => {
  useDirection();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<TrackSelection | null>(null);

  const handleSelect = (sel: TrackSelection) => {
    setSelection(sel);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main>
        <Hero />
        <WhySection />
        <Tracks onSelect={handleSelect} />
        <TrustSection />
        <Faq />
      </main>
      <Footer />
      <OrderForm open={open} selection={selection} onOpenChange={setOpen} />
      <StickyCta />
      <WhatsAppFloat />
    </div>
  );
};

export default Index;
