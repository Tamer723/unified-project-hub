import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function StickyCta() {
  const { t, i18n } = useTranslation();
  const [show, setShow] = useState(false);
  const Arrow = i18n.language === "ar" ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand/40 bg-background/95 px-4 py-3 shadow-elevated backdrop-blur-md md:hidden">
      <Button
        asChild
        size="lg"
        className="w-full rounded-full bg-green hover:bg-green-mid text-primary-foreground"
      >
        <a href="#tracks" className="inline-flex items-center justify-center gap-2">
          {t("sticky_cta.label")}
          <Arrow className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
