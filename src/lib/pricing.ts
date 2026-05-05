import { USD_TO_TRY, type Locale } from "./constants";

/** Format a USD price for display based on the active locale.
 *  - tr → Turkish Lira only (₺), converted at fixed rate
 *  - ar / en → USD only ($) */
export function formatPrice(amountUsd: number, locale: Locale): string {
  if (locale === "tr") {
    const try_ = Math.round(amountUsd * USD_TO_TRY);
    return `${try_.toLocaleString("tr-TR")} ₺`;
  }
  return `$${amountUsd.toLocaleString("en-US")}`;
}

export function paymentCurrency(locale: Locale): "TRY" | "USD" {
  return locale === "tr" ? "TRY" : "USD";
}

export const COUNTRY_CODES = ["SY", "EG", "SD", "TD", "LB", "YE"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const ANIMAL_PRICES: Record<"sheep" | "cow", number> = {
  sheep: 115,
  cow: 250,
};
export type AnimalCode = keyof typeof ANIMAL_PRICES;

export const TRACK_PRICES = {
  track1: 100,
  track2: 175,
  track3From: 115,
} as const;
