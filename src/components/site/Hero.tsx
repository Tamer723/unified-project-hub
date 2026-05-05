import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  return (
    <section className="relative overflow-hidden bg-cream py-16 md:py-24">
      <div className="pointer-events-none absolute -top-40 -start-40 h-[500px] w-[500px] rounded-full bg-sand/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -end-32 h-[400px] w-[400px] rounded-full bg-green/15 blur-3xl" />
      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-pale px-4 py-1.5 text-sm font-medium text-green">
            ✦ {t("hero.badge")}
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-brown md:text-6xl">
            {t("hero.title")}
          </h1>
          <div className="mx-auto mt-6 max-w-2xl border-s-4 border-sand bg-sand/10 px-5 py-4 rounded-e-xl text-start">
            <p className="text-base leading-relaxed text-brown-mid md:text-lg">
              {t("hero.subtitle")}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-green hover:bg-green-mid text-primary-foreground rounded-full px-8 shadow-soft"
            >
              <a href="#tracks" className="inline-flex items-center gap-2">
                {t("hero.cta_primary")}
                <Arrow className="h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-brown/30 text-brown hover:bg-brown/5"
            >
              <a href="#trust">{t("hero.cta_secondary")}</a>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { v: "5,000+", k: "sacrifices" },
            { v: "6", k: "countries" },
            { v: "5+", k: "years" },
          ].map((s) => (
            <div
              key={s.k}
              className="rounded-2xl border border-sand/30 bg-white/70 px-6 py-5 text-center shadow-soft backdrop-blur-sm"
            >
              <div className="text-3xl font-bold text-green">{s.v}</div>
              <div className="mt-1 text-sm text-brown-mid">
                {t(`hero.stats.${s.k}`)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
