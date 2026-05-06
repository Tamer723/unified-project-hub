import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Beef, ShieldCheck, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceholderImage } from "./PlaceholderImage";

export function Hero() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <section className="relative overflow-hidden bg-cream py-12 md:py-20">
      <div className="absolute inset-0 bg-pattern-dots opacity-60" />
      <div className="pointer-events-none absolute -top-40 -start-40 h-[500px] w-[500px] rounded-full bg-sand/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -end-32 h-[400px] w-[400px] rounded-full bg-green/15 blur-3xl" />

      <div className="container relative grid items-center gap-12 lg:grid-cols-2">
        {/* Text column */}
        <div className="text-center lg:text-start">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-pale px-4 py-1.5 text-sm font-bold text-green">
            ✦ {t("hero.badge")}
          </span>
          <h1 className="mt-6 text-5xl font-black leading-[1.05] text-brown md:text-6xl lg:text-7xl">
            {t("hero.title")}
          </h1>
          <div className="mt-6 inline-block max-w-2xl border-s-4 border-sand bg-sand/10 px-5 py-4 rounded-e-2xl text-start">
            <p className="text-base leading-relaxed text-brown-mid md:text-lg">
              {t("hero.subtitle")}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-green hover:bg-green-mid text-primary-foreground px-8 shadow-elevated"
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

          <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg mx-auto lg:mx-0">
            {[
              { v: "5,000+", k: "sacrifices" },
              { v: "7", k: "countries" },
              { v: "5+", k: "years" },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-2xl border border-sand/30 bg-card/70 px-3 py-4 text-center shadow-soft backdrop-blur-sm"
              >
                <div className="text-2xl font-black text-green">{s.v}</div>
                <div className="mt-1 text-xs text-brown-mid">{t(`hero.stats.${s.k}`)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual column */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <PlaceholderImage icon={Beef} ratio="portrait" className="rounded-[2.5rem] shadow-float" />
          {/* Floating: live price card */}
          <div className="absolute -bottom-6 -start-4 flex items-center gap-3 rounded-2xl bg-card p-3 shadow-elevated border border-sand/40 max-w-[220px]">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-green-pale">
              <Heart className="h-6 w-6 text-green" />
            </div>
            <div className="text-start">
              <div className="text-xs text-brown-mid">{t("hero.float_card.label")}</div>
              <div className="text-base font-extrabold text-brown">{t("hero.float_card.value")}</div>
            </div>
          </div>
          {/* Floating: trust badge */}
          <div className="absolute -top-4 -end-2 flex items-center gap-2 rounded-full bg-brown text-primary-foreground px-4 py-2 shadow-elevated">
            <ShieldCheck className="h-4 w-4 text-sand" />
            <span className="text-xs font-bold">{t("hero.float_badge")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
