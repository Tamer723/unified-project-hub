export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "troy" | "unknown";

export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(5[1-5]|2(2(2[1-9]|[3-9]\d)|[3-6]\d{2}|7([01]\d|20)))/.test(digits)) return "mastercard";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  if (/^9792/.test(digits)) return "troy";
  return "unknown";
}

export function formatCardNumber(raw: string, brand: CardBrand): string {
  const digits = raw.replace(/\D/g, "").slice(0, brand === "amex" ? 15 : 16);
  if (brand === "amex") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(" ");
  }
  return digits.match(/.{1,4}/g)?.join(" ") ?? "";
}

/** Luhn check */
export function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function isValidExpiry(mmYY: string): boolean {
  const m = mmYY.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const exp = new Date(year, month, 0, 23, 59, 59);
  return exp >= now;
}

export function isValidCvc(cvc: string, brand: CardBrand): boolean {
  const d = cvc.replace(/\D/g, "");
  return brand === "amex" ? d.length === 4 : d.length === 3;
}
