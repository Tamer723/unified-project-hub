import { useTranslation } from "react-i18next";
import { Heart, Utensils, HandHeart } from "lucide-react";

const icons = [Heart, Utensils, HandHeart];

export function WhySection() {
  const { t } = useTranslation();
  const cards = t("why.cards", { returnObjects: true }) as Array<{
    verse: string;
    title: string;
    text: string;
  }>;

  return (
    <section id="why" className="relative overflow-hidden bg-cream py-16 md:py-24">
      <div className="absolute inset-0 bg-pattern-grid opacity-40" />
      <div className="container relative">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-sand/20 px-4 py-1 text-xs font-bold text-brown-mid">
            {t("why.eyebrow")}
          </span>
          <h2 className="mt-3 text-3xl font-black text-brown md:text-4xl">{t("why.title")}</h2>
          <p className="mt-3 text-brown-mid">{t("why.subtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((c, i) => {
            const Icon = icons[i];
            return (
              <article
                key={i}
                className="group rounded-3xl border border-sand/30 bg-card p-6 shadow-soft transition-all hover:shadow-elevated hover:-translate-y-1"
              >
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-green-pale text-green transition-colors group-hover:bg-green group-hover:text-primary-foreground">
                  <Icon className="h-7 w-7" />
                </div>
                <p className="rounded-2xl border-s-4 border-sand bg-sand/5 px-4 py-3 text-base font-bold text-brown leading-relaxed">
                  {c.verse}
                </p>
                <h3 className="mt-4 text-xl font-extrabold text-brown">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brown-mid">{c.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
