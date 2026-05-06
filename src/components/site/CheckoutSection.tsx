import { useMemo, useState } from "react";
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
import type { Locale } from "@/lib/constants";
import type { TrackSelection } from "./TrackCard";

const COUNTRIES = [
  { code: "TR", flag: "🇹🇷", dial: "+90", min: 10, max: 10 },
  { code: "SA", flag: "🇸🇦", dial: "+966", min: 9, max: 9 },
  { code: "AE", flag: "🇦🇪", dial: "+971", min: 9, max: 9 },
  { code: "EG", flag: "🇪🇬", dial: "+20", min: 10, max: 10 },
  { code: "JO", flag: "🇯🇴", dial: "+962", min: 9, max: 9 },
  { code: "KW", flag: "🇰🇼", dial: "+965", min: 8, max: 8 },
  { code: "QA", flag: "🇶🇦", dial: "+974", min: 8, max: 8 },
  { code: "BH", flag: "🇧🇭", dial: "+973", min: 8, max: 8 },
  { code: "OM", flag: "🇴🇲", dial: "+968", min: 8, max: 8 },
  { code: "PS", flag: "🇵🇸", dial: "+970", min: 9, max: 9 },
  { code: "LB", flag: "🇱🇧", dial: "+961", min: 7, max: 8 },
  { code: "SY", flag: "🇸🇾", dial: "+963", min: 9, max: 9 },
  { code: "IQ", flag: "🇮🇶", dial: "+964", min: 10, max: 10 },
  { code: "YE", flag: "🇾🇪", dial: "+967", min: 9, max: 9 },
  { code: "GB", flag: "🇬🇧", dial: "+44", min: 10, max: 10 },
  { code: "US", flag: "🇺🇸", dial: "+1", min: 10, max: 10 },
];

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
  const [dialCode, setDialCode] = useState("+90");
  const [phone, setPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const cardBrand = detectCardBrand(cardNumber.replace(/\D/g, ""));
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paying, setPaying] = useState(false);
  const [agree, setAgree] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const unitPrice = selection?.unitPrice ?? 0;
  const total = unitPrice * quantity;

  const trackLabel = useMemo(() => {
    if (!selection) return t("checkout.select_first");
    const base = `${t(`${selection.trackId}.title`)} — ${t(`${selection.trackId}.tagline`)}`;
    return `${base} | ${formatPrice(selection.unitPrice, locale)}`;
  }, [selection, locale, t]);

  const country = COUNTRIES.find((c) => c.dial === dialCode) ?? COUNTRIES[0];

  const validateInfo = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = t("form.errors.name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t("form.errors.email");
    const digits = phone.replace(/\D/g, "");
    if (digits.length > 0) {
      if (digits.length < country.min || digits.length > country.max) {
        const range = country.min === country.max ? `${country.min}` : `${country.min}-${country.max}`;
        e.phone =
          locale === "ar"
            ? `رقم الهاتف يجب أن يتكون من ${range} رقمًا`
            : locale === "tr"
              ? `Telefon ${range} hane olmalı`
              : `Phone must be ${range} digits`;
      }
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
  };

  const validateCard = () => {
    const e: Record<string, string> = {};
    if (cardHolder.trim().length < 2)
      e.cc_name = locale === "ar" ? "أدخل اسم حامل البطاقة" : locale === "tr" ? "Kart sahibi adı" : "Cardholder name";
    if (!isValidCardNumber(cardNumber))
      e.cc_number = locale === "ar" ? "رقم البطاقة غير صالح" : locale === "tr" ? "Geçersiz kart numarası" : "Invalid card number";
    if (!isValidExpiry(cardExpiry))
      e.cc_exp = locale === "ar" ? "تاريخ غير صالح" : locale === "tr" ? "Geçersiz tarih" : "Invalid expiry";
    if (!isValidCvc(cardCvc, cardBrand))
      e.cc_cvc = "CVC";
    setErrors((prev) => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
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
    if (!validateCard()) return;

    setPaying(true);
    try {
      const [mm, yy] = cardExpiry.split("/").map((s) => s.trim());
      const digits = cardNumber.replace(/\D/g, "");

      const { data, error } = await supabase.functions.invoke("ziraat-payment-init", {
        body: {
          donor: { name, email, phone: phone ? `${dialCode}${phone.replace(/\s/g, "")}` : null },
          intention: intention || null,
          quantity,
          unit_price: selection.unitPrice,
          currency: paymentCurrency(locale),
          card: {
            number: digits,
            holder: cardHolder.trim(),
            expMonth: parseInt(mm, 10),
            expYear: 2000 + parseInt(yy, 10),
            cvc: cardCvc.replace(/\D/g, ""),
          },
        },
      });

      if (error || !data || data.responseCode !== "00") {
        const msg = data?.responseMessage || error?.message || "Payment init failed";
        toast.error(msg);
        return;
      }

      const last4 = digits.slice(-4);
      const url = `${data.threeDSUrl}&last4=${last4}&amount=${data.amount}&currency=${data.currency}`;
      navigate(url);
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
                  onChange={(e) => setName(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  <Select value={dialCode} onValueChange={setDialCode}>
                    <SelectTrigger className="h-12 w-[110px] shrink-0 rounded-xl bg-cream-dark/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.dial}>
                          <span className="mr-2">{c.flag}</span>
                          {c.dial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="5XX XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
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
                      {locale === "ar" ? "الاسم على البطاقة" : locale === "tr" ? "Kart Üzerindeki İsim" : "Cardholder Name"}
                    </Label>
                    <Input
                      id="cc-name"
                      autoComplete="cc-name"
                      placeholder={locale === "ar" ? "كما يظهر على البطاقة" : "JOHN DOE"}
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      className="mt-2 h-12 rounded-xl bg-cream-dark/60 uppercase"
                    />
                    {errors.cc_name && <p className="mt-1 text-xs text-destructive">{errors.cc_name}</p>}
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
                          setCardNumber(formatCardNumber(digits, brand));
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
                          let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                          if (v.length >= 3) v = `${v.slice(0, 2)} / ${v.slice(2)}`;
                          setCardExpiry(v);
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
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
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

          <div className="mt-6 flex items-center justify-between gap-3">
            {step === 2 ? (
              <Button
                onClick={handlePay}
                disabled={paying}
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
