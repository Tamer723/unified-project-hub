import { useTranslation } from "react-i18next";
import { Beef, Package, Heart, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlaceholderImage } from "./PlaceholderImage";
import { formatPrice, COUNTRY_CODES, ANIMAL_CODES, type CountryCode, type AnimalCode } from "@/lib/pricing";
import { resolveTrackPrice } from "@/hooks/usePricing";
import type { Locale } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type TrackId = "track1" | "track2" | "track3";

export type TrackSelection = {
  trackId: TrackId;
  unitPrice: number;
  country?: CountryCode;
  animal?: AnimalCode;
};

type Props = {
  id: TrackId;
  pricingData: Parameters<typeof resolveTrackPrice>[1];
  locale: Locale;
  popular?: boolean;
  disabled?: boolean;
  country?: CountryCode;
  animal?: AnimalCode;
  onCountryChange?: (c: CountryCode) => void;
  onAnimalChange?: (a: AnimalCode) => void;
  onChoose: (sel: TrackSelection) => void;
};

const trackIcons: Record<TrackId, typeof Heart> = {
  track1: Heart,
  track2: Package,
  track3: Beef,
};

export function TrackCard({
  id,
  pricingData,
  locale,
  popular,
  disabled,
  country,
  animal,
  onCountryChange,
  onAnimalChange,
  onChoose,
}: Props) {
  const { t } = useTranslation();
  const Icon = trackIcons[id];

  const features = id === "track3"
    ? (t("track3.features", { returnObjects: true }) as string[])
    : (t(`${id}.features`, { returnObjects: true }) as string[]);

  const unitPrice = resolveTrackPrice(id, pricingData, country, animal);

  const handleChoose = () => {
    onChoose({
      trackId: id,
      unitPrice,
      country: id === "track3" ? country : undefined,
      animal: id === "track3" ? animal : undefined,
    });
  };

  return (
    <article
      className={cn(
        "relative grid h-full grid-rows-[auto_auto_140px_1fr_auto] rounded-3xl border bg-card shadow-soft transition-all",
        !disabled && "hover:shadow-elevated hover:-translate-y-1",
        popular ? "border-sand ring-2 ring-sand/40" : "border-sand/30",
        disabled && "opacity-60 grayscale",
      )}
      aria-disabled={disabled || undefined}
    >
      {disabled ? (
        <span className="absolute -top-3 start-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-muted px-4 py-1 text-xs font-extrabold text-muted-foreground shadow-soft">
          {t("tracks.unavailable")}
        </span>
      ) : popular && (
        <span className="absolute -top-3 start-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-sand px-4 py-1 text-xs font-extrabold text-brown shadow-soft">
          <Star className="h-3 w-3 fill-current" />
          {t("tracks.popular")}
        </span>
      )}

      {/* row 1: image */}
      <div className="p-4 pb-0">
        <PlaceholderImage icon={Icon} ratio="wide" className="rounded-2xl" />
      </div>

      {/* row 2: title */}
      <div className="px-5 pt-4">
        <h3 className="text-xl font-extrabold text-brown">{t(`${id}.title`)}</h3>
        <p className="mt-1 text-sm text-brown-mid">{t(`${id}.tagline`)}</p>
      </div>

      {/* row 3: selector area (fixed height for alignment) */}
      <div className="px-5 pt-4">
        {id === "track3" ? (
          <div className="grid grid-cols-2 gap-2">
            <Select value={country} onValueChange={(v) => onCountryChange?.(v as CountryCode)}>
              <SelectTrigger className="rounded-xl text-xs h-10">
                <SelectValue placeholder={t("track3.country_label")} />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`track3.countries.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={animal} onValueChange={(v) => onAnimalChange?.(v as AnimalCode)}>
              <SelectTrigger className="rounded-xl text-xs h-10">
                <SelectValue placeholder={t("track3.animal_label")} />
              </SelectTrigger>
              <SelectContent>
                {ANIMAL_CODES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(`track3.animals.${a}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="col-span-2 text-[11px] text-brown-mid text-center">
              {t("track3.weight_note")}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-green-pale/60 px-3 py-2 text-center text-xs font-semibold text-green">
            {t(`${id}.note`)}
          </div>
        )}
      </div>

      {/* row 4: features (flex) */}
      <ul className="space-y-2 px-5 py-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-brown-mid">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* row 5: price + cta (sticky bottom band) */}
      <div className="rounded-b-3xl border-t border-sand/30 bg-cream-dark/40 px-5 py-4">
        <div className="mb-3 flex items-baseline gap-2">
          {id === "track3" && (!country || !animal) && (
            <span className="text-xs text-brown-mid">{t("tracks.from")}</span>
          )}
          <span className="text-3xl font-black text-green">{formatPrice(unitPrice, locale)}</span>
          <span className="text-xs text-brown-mid">/ {t("tracks.unit")}</span>
        </div>
        <Button
          onClick={handleChoose}
          disabled={id === "track3" && (!country || !animal)}
          className="w-full rounded-full bg-green hover:bg-green-mid text-primary-foreground"
        >
          {t("tracks.choose")}
        </Button>
      </div>
    </article>
  );
}
