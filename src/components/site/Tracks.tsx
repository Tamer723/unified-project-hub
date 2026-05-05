import { useTranslation } from "react-i18next";
import { Beef, Package, Heart, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlaceholderImage } from "./PlaceholderImage";
import { formatPrice, TRACK_PRICES } from "@/lib/pricing";
import type { Locale } from "@/lib/constants";

export type TrackId = "track1" | "track2" | "track3";

type Props = {
  onSelect: (id: TrackId) => void;
};

export function Tracks({ onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.split("-")[0] || "ar") as Locale;

  const tracks: Array<{
    id: TrackId;
    icon: typeof Heart;
    price: string;
    fromLabel?: boolean;
    popular?: boolean;
    features: string[];
  }> = [
    {
      id: "track1",
      icon: Heart,
      price: formatPrice(TRACK_PRICES.track1, locale),
      popular: true,
      features: t("track1.features", { returnObjects: true }) as string[],
    },
    {
      id: "track2",
      icon: Package,
      price: formatPrice(TRACK_PRICES.track2, locale),
      features: t("track2.features", { returnObjects: true }) as string[],
    },
    {
      id: "track3",
      icon: Beef,
      price: formatPrice(TRACK_PRICES.track3From, locale),
      fromLabel: true,
      features: [
        t("track3.countries.SY"),
        t("track3.countries.SD"),
        t("track3.animals.sheep"),
      ],
    },
  ];

  return (
    <section id="tracks" className="bg-cream-dark/60 py-16 md:py-24">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-brown md:text-4xl">{t("tracks.title")}</h2>
          <p className="mt-3 text-brown-mid">{t("tracks.subtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {tracks.map((tr) => (
            <article
              key={tr.id}
              className="relative flex flex-col rounded-2xl border border-sand/30 bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated"
            >
              {tr.popular && (
                <span className="absolute -top-3 start-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-sand px-3 py-1 text-xs font-bold text-brown shadow-soft">
                  <Star className="h-3 w-3 fill-current" />
                  {t("tracks.popular")}
                </span>
              )}
              <PlaceholderImage icon={tr.icon} ratio="video" />
              <h3 className="mt-5 text-xl font-bold text-brown">{t(`${tr.id}.title`)}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                {tr.fromLabel && (
                  <span className="text-sm text-brown-mid">{t("tracks.from")}</span>
                )}
                <span className="text-3xl font-extrabold text-green">{tr.price}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {tr.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brown-mid">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => onSelect(tr.id)}
                className="mt-6 bg-green hover:bg-green-mid text-primary-foreground rounded-full"
              >
                {t("tracks.choose")}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
