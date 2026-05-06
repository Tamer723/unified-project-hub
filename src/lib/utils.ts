import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import i18n from "@/i18n/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pick the localized variant of an asset URL based on the current i18n language.
 *
 * Example:
 *   localizedAsset({ ar: "/img/hero-ar.jpg", en: "/img/hero-en.jpg" }, "/img/hero.jpg")
 *
 * Falls back through: current lang -> AR -> EN -> TR -> fallback.
 */
export function localizedAsset(
  variants: Partial<Record<"ar" | "tr" | "en", string | null | undefined>>,
  fallback?: string | null,
): string | undefined {
  const lang = (i18n.language?.slice(0, 2) || "ar") as "ar" | "tr" | "en";
  return (
    variants[lang] ||
    variants.ar ||
    variants.en ||
    variants.tr ||
    fallback ||
    undefined
  );
}
