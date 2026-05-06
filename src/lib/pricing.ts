import { USD_TO_TRY, type Locale } from "./constants";

/** Format USD as ₺ for Turkish, $ otherwise. */
export function formatPrice(amountUsd: number, locale: Locale): string {
  if (locale === "tr") {
    const tryAmt = Math.round(amountUsd * USD_TO_TRY);
    return `${tryAmt.toLocaleString("tr-TR")} ₺`;
  }
  return `$${amountUsd.toLocaleString("en-US")}`;
}

export function paymentCurrency(locale: Locale): "TRY" | "USD" {
  return locale === "tr" ? "TRY" : "USD";
}

export const COUNTRY_CODES = ["JM", "WB", "LB", "SY", "SD", "YE", "BD"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export type AnimalCode = "sheep" | "cow_share";
export const ANIMAL_CODES: AnimalCode[] = ["sheep", "cow_share"];

/** Static fallback if DB fetch fails. Mirrors product_price_matrix seed. */
export const FALLBACK_MATRIX: Record<CountryCode, Record<AnimalCode, number>> = {
  JM: { sheep: 850, cow_share: 530 },
  WB: { sheep: 750, cow_share: 500 },
  LB: { sheep: 350, cow_share: 345 },
  SY: { sheep: 320, cow_share: 360 },
  SD: { sheep: 180, cow_share: 120 },
  YE: { sheep: 130, cow_share: 120 },
  BD: { sheep: 175, cow_share: 115 },
};

/** Static fallback for weight (kg) if DB fetch fails. */
export const FALLBACK_WEIGHTS: Record<CountryCode, Record<AnimalCode, number>> = {
  JM: { sheep: 50, cow_share: 350 },
  WB: { sheep: 50, cow_share: 350 },
  LB: { sheep: 40, cow_share: 350 },
  SY: { sheep: 42, cow_share: 350 },
  SD: { sheep: 23, cow_share: 200 },
  YE: { sheep: 23, cow_share: 200 },
  BD: { sheep: 20, cow_share: 150 },
};

export const TRACK_PRICES = {
  track1: 100,
  track2: 175,
  track3From: 115,
} as const;
