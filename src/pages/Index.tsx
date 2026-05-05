import { useState } from "react";
import { useDirection } from "@/hooks/useDirection";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Tracks, type TrackId } from "@/components/site/Tracks";
import { OrderForm } from "@/components/site/OrderForm";
import { TrustSection } from "@/components/site/TrustSection";
import { Faq } from "@/components/site/Faq";
import { Footer } from "@/components/site/Footer";

const Index = () => {
  useDirection();
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState<TrackId | null>(null);

  const onSelect = (id: TrackId) => {
    setTrack(id);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main>
        <Hero />
        <Tracks onSelect={onSelect} />
        <TrustSection />
        <Faq />
      </main>
      <Footer />
      <OrderForm open={open} trackId={track} onOpenChange={setOpen} />
    </div>
  );
};

export default Index;
