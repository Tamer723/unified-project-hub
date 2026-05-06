import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Lock, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatPrice, paymentCurrency } from "@/lib/pricing";
import { isValidCardNumber, isValidExpiry, isValidCvc } from "@/lib/card";
import { supabase } from "@/integrations/supabase/client";
import { Turnstile } from "./Turnstile";
import { AsYouType, getCountries, getCountryCallingCode, isValidPhoneNumber, getExampleNumber } from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import type { CountryCode } from "libphonenumber-js";
import type { Locale } from "@/lib/constants";
import type { TrackSelection } from "./TrackCard";

function flagEmoji(code: string): string {
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const PRIORITY_CODES: CountryCode[] = ["TR","SA","AE","EG","JO","KW","QA","BH","OM","PS","LB","SY","IQ","YE","GB","US"];

const COUNTRIES = (() => {
  const all = getCountries().map((code) => ({
    code: code as CountryCode,
    flag: flagEmoji(code),
    dial: `+${getCountryCallingCode(code as CountryCode)}`,
  }));
  const priority = PRIORITY_CODES
    .map((c) => all.find((x) => x.code === c))
    .filter(Boolean) as typeof all;
  const rest = all.filter((c) => !PRIORITY_CODES.includes(c.code)).sort((a, b) => a.code.localeCompare(b.code));
  return [...priority, ...rest];
})();

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "troy" | "unknown";

function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(5[1-5]|2(2(2[1-9]|[3-9]\d)|[3-6]\d{2}|7([01]\d|20)))/.test(digits)) return "mastercard";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  if (/^9792/.test(digits)) return "troy";
  return "unknown";
}

function formatCardNumber(raw: string, brand: CardBrand): string {
  const digits = raw.replace(/\D/g, "").slice(0, brand === "amex" ? 15 : 16);
  if (brand === "amex") {
    // 4-6-5
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(" ");
  }
  return digits.match(/.{1,4}/g)?.join(" ") ?? "";
}

function BrandLogo({ brand }: { brand: CardBrand }) {
  const base = "flex h-7 min-w-[44px] items-center justify-center rounded px-1.5 text-[10px] font-black tracking-tight";
  if (brand === "visa") return <span className={cn(base, "bg-[#1A1F71] text-white")}>VISA</span>;
  if (brand === "mastercard")
    return (
      <span className="relative flex h-7 w-11 items-center">
        <span className="absolute left-0 h-6 w-6 rounded-full bg-[#EB001B]" />
        <span className="absolute left-4 h-6 w-6 rounded-full bg-[#F79E1B] mix-blend-multiply" />
      </span>
    );
  if (brand === "amex") return <span className={cn(base, "bg-[#2E77BC] text-white")}>AMEX</span>;
  if (brand === "discover") return <span className={cn(base, "bg-[#FF6000] text-white")}>DISC</span>;
  if (brand === "troy") return <span className={cn(base, "bg-[#00A0E3] text-white")}>TROY</span>;
  return <CreditCard className="h-5 w-5 text-brown-mid/50" />;
}

type Props = {
  selection: TrackSelection | null;
  onChangeSelection: (sel: TrackSelection) => void;
};

export function CheckoutSection({ selection }: Props) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.split("-")[0] || "ar") as Locale;
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [intention, setIntention] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("TR");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const cardBrand = detectCardBrand(cardNumber.replace(/\D/g, ""));
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paying, setPaying] = useState(false);
  const [agree, setAgree] = useState(true);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  type ProviderId = "mock" | "nestpay_3d" | "nestpay_hosting" | "iyzico_checkout" | "iyzico_3ds";
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(null);
  const [threeDSHtml, setThreeDSHtml] = useState<string | null>(null);

  const fetchProvider = async (): Promise<ProviderId | null> => {
    const { data } = await supabase.rpc("get_active_payment_provider");
    const row = Array.isArray(data) ? data[0] : data;
    const p = (row?.active_provider as ProviderId | undefined) ?? null;
    if (p) setActiveProvider(p);
    return p;
  };

  useEffect(() => {
    fetchProvider();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardOnSite = activeProvider === "mock" || activeProvider === "nestpay_3d" || activeProvider === "iyzico_3ds";
  const providerReady = activeProvider !== null;

  const unitPrice = selection?.unitPrice ?? 0;
  const total = unitPrice * quantity;

  const trackLabel = useMemo(() => {
    if (!selection) return t("checkout.select_first");
    const base = `${t(`${selection.trackId}.title`)} — ${t(`${selection.trackId}.tagline`)}`;
    return `${base} | ${formatPrice(selection.unitPrice, locale)}`;
  }, [selection, locale, t]);

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];

  const phoneInvalidMsg = locale === "ar" ? "رقم الهاتف غير صالح" : locale === "tr" ? "Geçersiz telefon" : "Invalid phone number";

  const phoneExample = (() => {
    try {
      const ex = getExampleNumber(countryCode, examples as never);
      if (!ex) return "";
      return new AsYouType(countryCode).input(ex.nationalNumber as string);
    } catch { return ""; }
  })();

  const validateInfo = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = t("form.errors.name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t("form.errors.email");
    if (phone.trim().length > 0 && !isValidPhoneNumber(phone, countryCode)) {
      e.phone = phoneInvalidMsg;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!selection) {
      toast.error(t("checkout.select_first"));
      return;
    }
    if (!validateInfo()) return;
    setStep(2);
    requestAnimationFrame(() => {
      const el = document.getElementById("checkout");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => document.getElementById("cc-name")?.focus(), 350);
    });
  };

  const cardNumberValid = isValidCardNumber(cardNumber);
  const cardExpiryValid = isValidExpiry(cardExpiry);
  const cardCvcValid = isValidCvc(cardCvc, cardBrand);
  const cardFormValid = cardNumberValid && cardExpiryValid && cardCvcValid;

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });

  const validateCard = () => {
    const e: Record<string, string> = {};
    if (!cardNumberValid)
      e.cc_number = locale === "ar" ? "رقم البطاقة غير صالح" : locale === "tr" ? "Geçersiz kart numarası" : "Invalid card number";
    if (!cardExpiryValid)
      e.cc_exp = locale === "ar" ? "تاريخ غير صالح" : locale === "tr" ? "Geçersiz tarih" : "Invalid expiry";
    if (!cardCvcValid)
      e.cc_cvc = "CVC";
    setErrors((prev) => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  };

  const submitRedirectPost = (action: string, fields: Record<string, string>) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    form.style.display = "none";
    Object.entries(fields).forEach(([k, v]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = v ?? "";
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const handlePay = async () => {
    if (!agree) {
      toast.error(t("form.errors.consent"));
      return;
    }
    if (!selection) {
      toast.error(t("checkout.select_first"));
      return;
    }
    // Always re-fetch active provider before paying to avoid stale provider (e.g. after returning from success page)
    const currentProvider = (await fetchProvider()) ?? activeProvider;
    const currentCardOnSite = currentProvider === "mock" || currentProvider === "nestpay_3d" || currentProvider === "iyzico_3ds";
    if (currentCardOnSite && !validateCard()) return;
    if (!captchaToken) {
      toast.error(locale === "ar" ? "يرجى إكمال التحقق الأمني" : locale === "tr" ? "Güvenlik doğrulamasını tamamlayın" : "Please complete the security check");
      return;
    }

    setPaying(true);
    try {
      const cardPayload = currentCardOnSite
        ? (() => {
            const [mm, yy] = cardExpiry.split("/").map((s) => s.trim());
            const digits = cardNumber.replace(/\D/g, "");
            return {
              number: digits,
              holder: cardHolder.trim() || undefined,
              expMonth: parseInt(mm, 10),
              expYear: 2000 + parseInt(yy, 10),
              cvc: cardCvc.replace(/\D/g, ""),
            };
          })()
        : undefined;

      const { data, error } = await supabase.functions.invoke("payment-init", {
        body: {
          donor: { name, email, phone: phone ? `+${getCountryCallingCode(countryCode)}${phone.replace(/\D/g, "")}` : null },
          intention: intention || null,
          quantity,
          unit_price: selection.unitPrice,
          currency: paymentCurrency(locale),
          track_code: selection.trackId,
          track_country: selection.country ?? null,
          track_animal: selection.animal ?? null,
          captchaToken,
          card: cardPayload,
          lang: locale,
          origin: window.location.origin,
        },
      });

      if (error || !data || data.responseCode !== "00") {
        const msg = data?.responseMessage || error?.message || "Payment init failed";
        toast.error(msg);
        return;
      }

      if (data.mode === "internal_3ds" && data.threeDSUrl) {
        const last4 = cardPayload ? cardPayload.number.slice(-4) : (data.last4 ?? "0000");
        const url = `${data.threeDSUrl}&last4=${last4}&amount=${data.amount}&currency=${data.currency}`;
        navigate(url);
      } else if (data.mode === "redirect_post" && data.action && data.fields) {
        submitRedirectPost(data.action, data.fields);
      } else if (data.mode === "redirect_url" && data.action) {
        window.location.href = data.action;
      } else if (data.mode === "render_html" && data.html) {
        setThreeDSHtml(data.html);
      } else {
        toast.error("Unexpected payment response");
      }
    } catch (err) {
      console.error(err);
      toast.error(locale === "ar" ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setPaying(false);
    }
  };

  return (
    <section id="checkout" className="bg-cream-dark/60 py-16 md:py-24">
      <div className="container">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-green/10 px-4 py-1 text-xs font-bold text-green">
            {t("checkout.eyebrow")}
          </span>
          <h2 className="mt-3 text-3xl font-black text-brown md:text-4xl">
            {t("checkout.title")}
          </h2>
          <p className="mt-3 text-brown-mid">{t("checkout.subtitle")}</p>
        </div>

        <div className="mx-auto max-w-3xl rounded-3xl border border-sand/40 bg-card p-5 shadow-soft md:p-8">
          <Stepper step={step} />

          {/* Track summary */}
          <div className="mt-6 rounded-2xl border border-sand/30 bg-cream-dark/40 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brown-mid">
              {t("checkout.selected_track")}
            </div>
            <div className="mt-1 text-sm font-bold text-brown">{trackLabel}</div>
          </div>

          {step === 1 && (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="name" className="text-brown-mid">
                  {t("form.name")} *
                </Label>
                <Input
                  id="name"
                  placeholder={locale === "ar" ? "اكتب اسمك الكامل" : "Your full name"}
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (e.target.value.trim().length >= 2) clearError("name"); }}
                  onBlur={() => { if (name.trim().length > 0 && name.trim().length < 2) setErrors((p) => ({ ...p, name: t("form.errors.name") })); }}
                  className="mt-2 h-12 rounded-xl bg-cream-dark/60"
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="email" className="text-brown-mid">
                  {t("form.email")} *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) clearError("email"); }}
                  onBlur={() => { if (email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) setErrors((p) => ({ ...p, email: t("form.errors.email") })); }}
                  className="mt-2 h-12 rounded-xl bg-cream-dark/60"
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="qty" className="text-brown-mid">
                  {t("form.quantity")}
                </Label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-2 h-12 rounded-xl bg-cream-dark/60"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-brown-mid">
                  {t("form.phone")}
                </Label>
                <div dir="ltr" className="mt-2 flex gap-2">
                  <Select
                    value={countryCode}
                    onValueChange={(v) => {
                      const next = v as CountryCode;
                      setCountryCode(next);
                      // Reformat existing phone to new country
                      const digits = phone.replace(/\D/g, "");
                      setPhone(digits ? new AsYouType(next).input(digits) : "");
                      clearError("phone");
                    }}
                  >
                    <SelectTrigger className="h-12 w-[130px] shrink-0 rounded-xl bg-cream-dark/60">
                      <SelectValue>
                        <span className="mr-1">{country.flag}</span>
                        {country.dial}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="mr-2">{c.flag}</span>
                          {c.code} {c.dial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder={phoneExample || "Phone number"}
                    value={phone}
                    onChange={(e) => {
                      // Strip leading zeros (national trunk prefix) — user enters subscriber number only
                      const raw = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
                      const formatted = new AsYouType(countryCode).input(raw);
                      setPhone(formatted);
                      if (!formatted || isValidPhoneNumber(formatted, countryCode)) clearError("phone");
                    }}
                    onBlur={() => {
                      if (phone.trim().length > 0 && !isValidPhoneNumber(phone, countryCode)) {
                        setErrors((p) => ({ ...p, phone: phoneInvalidMsg }));
                      }
                    }}
                    className="h-12 flex-1 rounded-xl bg-cream-dark/60 text-left"
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="intent" className="text-brown-mid">
                  {t("form.intention")}
                </Label>
                <Input
                  id="intent"
                  placeholder={locale === "ar" ? "اختياري — أسماء الموكَّل عنهم" : "Optional"}
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  className="mt-2 h-12 rounded-xl bg-cream-dark/60"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-5 space-y-5">
              <div className="space-y-3 rounded-2xl border border-sand/40 bg-cream-dark/40 p-5 text-sm">
                <Row k={t("form.name")} v={name} />
                <Row k={t("form.email")} v={email} />
                <Row k={t("form.quantity")} v={String(quantity)} />
                {intention && <Row k={t("form.intention")} v={intention} />}
              </div>

              {!cardOnSite && (
                <div className="rounded-2xl border border-sand/40 bg-cream-dark/40 p-5 text-sm text-brown-mid">
                  {locale === "ar"
                    ? "سيتم تحويلك إلى صفحة الدفع الآمنة لإدخال بيانات بطاقتك."
                    : locale === "tr"
                      ? "Kart bilgilerinizi girmek için güvenli ödeme sayfasına yönlendirileceksiniz."
                      : "You will be redirected to the secure payment page to enter your card details."}
                </div>
              )}

              {cardOnSite && (
              <div className="rounded-2xl border border-sand/40 bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-brown">
                    {locale === "ar" ? "بيانات البطاقة" : locale === "tr" ? "Kart Bilgileri" : "Card Details"}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-brown-mid">
                    <Lock className="h-3 w-3" />
                    <span>{locale === "ar" ? "اتصال مشفّر" : locale === "tr" ? "Şifreli" : "Encrypted"}</span>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="cc-name" className="text-brown-mid">
                      {locale === "ar" ? "الاسم على البطاقة (اختياري)" : locale === "tr" ? "Kart Üzerindeki İsim (opsiyonel)" : "Cardholder Name (optional)"}
                    </Label>
                    <Input
                      id="cc-name"
                      autoComplete="cc-name"
                      placeholder={locale === "ar" ? "كما يظهر على البطاقة" : "JOHN DOE"}
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      className="mt-2 h-12 rounded-xl bg-cream-dark/60 uppercase"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cc-number" className="text-brown-mid">
                      {locale === "ar" ? "رقم البطاقة" : locale === "tr" ? "Kart Numarası" : "Card Number"}
                    </Label>
                    <div dir="ltr" className="relative mt-2">
                      <Input
                        id="cc-number"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="1234 5678 9012 3456"
                        maxLength={cardBrand === "amex" ? 17 : 19}
                        value={cardNumber}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          const brand = detectCardBrand(digits);
                          const formatted = formatCardNumber(digits, brand);
                          setCardNumber(formatted);
                          const expectedLen = brand === "amex" ? 15 : 16;
                          if (isValidCardNumber(formatted)) {
                            clearError("cc_number");
                          } else if (digits.length >= expectedLen) {
                            setErrors((p) => ({ ...p, cc_number: locale === "ar" ? "رقم البطاقة غير صالح" : locale === "tr" ? "Geçersiz kart numarası" : "Invalid card number" }));
                          } else {
                            clearError("cc_number");
                          }
                        }}
                        onBlur={() => {
                          if (cardNumber && !isValidCardNumber(cardNumber)) {
                            setErrors((p) => ({ ...p, cc_number: locale === "ar" ? "رقم البطاقة غير صالح" : locale === "tr" ? "Geçersiz kart numarası" : "Invalid card number" }));
                          }
                        }}
                        className="h-12 rounded-xl bg-cream-dark/60 pe-16 font-mono tracking-wider text-left"
                      />
                      <div className="absolute inset-y-0 end-3 flex items-center">
                        <BrandLogo brand={cardBrand} />
                      </div>
                    </div>
                    {errors.cc_number && <p className="mt-1 text-xs text-destructive">{errors.cc_number}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="cc-exp" className="text-brown-mid">
                        {locale === "ar" ? "تاريخ الانتهاء" : locale === "tr" ? "Son Kullanma" : "Expiry"}
                      </Label>
                      <Input
                        id="cc-exp"
                        dir="ltr"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM / YY"
                        maxLength={7}
                        value={cardExpiry}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                          const v = raw.length >= 3 ? `${raw.slice(0, 2)} / ${raw.slice(2)}` : raw;
                          setCardExpiry(v);
                          if (isValidExpiry(v)) {
                            clearError("cc_exp");
                          } else if (raw.length >= 4 || (raw.length >= 2 && parseInt(raw.slice(0, 2), 10) > 12)) {
                            setErrors((p) => ({ ...p, cc_exp: locale === "ar" ? "تاريخ غير صالح" : locale === "tr" ? "Geçersiz tarih" : "Invalid expiry" }));
                          } else {
                            clearError("cc_exp");
                          }
                        }}
                        onBlur={() => {
                          if (cardExpiry && !isValidExpiry(cardExpiry)) {
                            setErrors((p) => ({ ...p, cc_exp: locale === "ar" ? "تاريخ غير صالح" : locale === "tr" ? "Geçersiz tarih" : "Invalid expiry" }));
                          }
                        }}
                        className="mt-2 h-12 rounded-xl bg-cream-dark/60 text-left font-mono"
                      />
                      {errors.cc_exp && <p className="mt-1 text-xs text-destructive">{errors.cc_exp}</p>}
                    </div>
                    <div>
                      <Label htmlFor="cc-cvc" className="text-brown-mid">
                        CVC
                      </Label>
                      <Input
                        id="cc-cvc"
                        dir="ltr"
                        type="password"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        maxLength={cardBrand === "amex" ? 4 : 3}
                        value={cardCvc}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setCardCvc(v);
                          const need = cardBrand === "amex" ? 4 : 3;
                          if (isValidCvc(v, cardBrand)) {
                            clearError("cc_cvc");
                          } else if (v.length >= need) {
                            setErrors((p) => ({ ...p, cc_cvc: "CVC" }));
                          } else {
                            clearError("cc_cvc");
                          }
                        }}
                        onBlur={() => {
                          if (cardCvc && !isValidCvc(cardCvc, cardBrand)) {
                            setErrors((p) => ({ ...p, cc_cvc: "CVC" }));
                          }
                        }}
                        className="mt-2 h-12 rounded-xl bg-cream-dark/60 text-left font-mono tracking-widest"
                      />
                      {errors.cc_cvc && <p className="mt-1 text-xs text-destructive">{errors.cc_cvc}</p>}
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[11px] text-brown-mid">
                  {locale === "ar"
                    ? "ستتم معالجة الدفع عبر بوابة البنك المحلي بشكل آمن."
                    : locale === "tr"
                      ? "Ödeme yerel banka ağ geçidi üzerinden güvenli şekilde işlenir."
                      : "Payment is securely processed via the local bank gateway."}
                </p>
              </div>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-green px-5 py-4 text-primary-foreground">
            <span className="text-2xl font-black">{formatPrice(total, locale)}</span>
            <span className="text-sm font-bold opacity-90">{t("checkout.total")}</span>
          </div>

          <label className="mt-4 flex items-start gap-2 text-xs text-brown-mid">
            <Checkbox
              checked={agree}
              onCheckedChange={(c) => setAgree(c === true)}
              className="mt-0.5"
            />
            <span>{t("checkout.agree")}</span>
          </label>

          {step === 2 && (
            <div className="mt-4 flex justify-center">
              <Turnstile
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {step === 2 ? (
              <Button
                onClick={handlePay}
                disabled={paying || !captchaToken || (cardOnSite && !cardFormValid)}
                size="lg"
                className="rounded-full bg-green hover:bg-green-mid text-primary-foreground"
              >
                {paying ? "..." : t("checkout.pay_cta")}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                size="lg"
                className="rounded-full bg-green hover:bg-green-mid text-primary-foreground"
              >
                {t("checkout.next")}
              </Button>
            )}

            <div className="flex items-center gap-2 text-xs text-brown-mid">
              <span className="rounded bg-brown px-2 py-0.5 font-bold text-primary-foreground">
                VISA
              </span>
              <span className="rounded bg-sand px-2 py-0.5 font-bold text-brown">MC</span>
              <span className="hidden md:inline">{t("checkout.secure")}</span>
              <Lock className="h-3 w-3" />
            </div>
          </div>

          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="mt-4 text-xs text-brown-mid hover:text-brown underline"
            >
              {t("checkout.back")}
            </button>
          )}
        </div>
      </div>

      {threeDSHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md h-[600px] bg-white rounded-2xl overflow-hidden relative">
            <button
              onClick={() => setThreeDSHtml(null)}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/50 text-white w-8 h-8 text-sm"
              aria-label="Close"
            >
              ×
            </button>
            <iframe
              title="3DS Challenge"
              srcDoc={threeDSHtml}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Stepper({ step }: { step: 1 | 2 }) {
  const { t } = useTranslation();
  const labels = [
    { n: "01", k: "info" },
    { n: "02", k: "pay" },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2">
      {labels.map((l, i) => {
        const idx = (i + 1) as 1 | 2;
        const active = step === idx;
        return (
          <div
            key={l.k}
            className={cn(
              "rounded-2xl px-4 py-3 text-center transition-colors",
              active ? "bg-green text-primary-foreground" : "bg-cream-dark/60 text-brown-mid",
            )}
          >
            <div className="text-[11px] font-bold opacity-80">{l.n}</div>
            <div className="text-sm font-bold">{t(`checkout.steps.${l.k}`)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-brown-mid">{k}</span>
      <span className="text-end font-bold text-brown">{v}</span>
    </div>
  );
}
