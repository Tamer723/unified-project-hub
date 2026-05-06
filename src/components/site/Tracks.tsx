import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrackCard, type TrackId, type TrackSelection } from "./TrackCard";
import { usePricing, isTrackActive } from "@/hooks/usePricing";
import type { CountryCode, AnimalCode } from "@/lib/pricing";
import type { Locale } from "@/lib/constants";

type Props = {
  onSelect: (sel: TrackSelection) => void;
};

export function Tracks({ onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.split("-")[0] || "ar") as Locale;
  const { data } = usePricing();

  const [country, setCountry] = useState<CountryCode | undefined>();
  const [animal, setAnimal] = useState<AnimalCode | undefined>();

  return (
    <section id="tracks" className="bg-cream-dark/60 py-16 md:py-24">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-green/10 px-4 py-1 text-xs font-bold text-green">
            {t("tracks.eyebrow")}
          </span>
          <h2 className="mt-3 text-3xl font-black text-brown md:text-4xl">{t("tracks.title")}</h2>
          <p className="mt-3 text-brown-mid">{t("tracks.subtitle")}</p>
        </div>
        <div className="grid items-stretch gap-6 md:grid-cols-3">
          {(["track1", "track2", "track3"] as TrackId[]).map((id) => (
            <TrackCard
              key={id}
              id={id}
              pricingData={data}
              locale={locale}
              popular={id === "track1"}
              country={id === "track3" ? country : undefined}
              animal={id === "track3" ? animal : undefined}
              onCountryChange={setCountry}
              onAnimalChange={setAnimal}
              onChoose={onSelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
