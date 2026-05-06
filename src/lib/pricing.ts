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
  JM: { sheep: 285, cow_share: 285 },
  WB: { sheep: 250, cow_share: 250 },
  LB: { sheep: 230, cow_share: 200 },
  SY: { sheep: 165, cow_share: 145 },
  SD: { sheep: 115, cow_share: 115 },
  YE: { sheep: 175, cow_share: 155 },
  BD: { sheep: 195, cow_share: 175 },
};

export const TRACK_PRICES = {
  track1: 100,
  track2: 175,
  track3From: 115,
} as const;
