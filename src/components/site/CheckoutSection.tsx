import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/pricing";
import type { Locale } from "@/lib/constants";
import type { TrackSelection, TrackId } from "./TrackCard";
import { usePricing } from "@/hooks/usePricing";
import { resolveTrackPrice, type ProductRow, type MatrixRow } from "@/hooks/usePricing";

type Props = {
  selection: TrackSelection | null;
  onChangeSelection: (sel: TrackSelection) => void;
};

const TRACK_IDS: TrackId[] = ["track1", "track2", "track3"];

export function CheckoutSection({ selection, onChangeSelection }: Props) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.split("-")[0] || "ar") as Locale;
  const navigate = useNavigate();
  const { data: pricingData } = usePricing();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [intention, setIntention] = useState("");
  const [agree, setAgree] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // when user picks a track from cards above, advance to step 2 automatically
  useEffect(() => {
    if (selection && step === 1) {
      setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?.trackId, selection?.unitPrice]);

  const unitPrice = selection?.unitPrice ?? 0;
  const total = unitPrice * quantity;

  const trackLabel = useMemo(() => {
    if (!selection) return "—";
    const base = `${t(`${selection.trackId}.title`)} — ${t(`${selection.trackId}.tagline`)}`;
    return `${base} | ${formatPrice(selection.unitPrice, locale)}`;
  }, [selection, locale, t]);

  const handleTrackChange = (id: TrackId) => {
    const price = resolveTrackPrice(id, pricingData);
    onChangeSelection({ trackId: id, unitPrice: price });
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = t("form.errors.name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t("form.errors.email");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !selection) {
      toast.error(t("checkout.select_first"));
      return;
    }
    if (step === 2 && !validateStep2()) return;
    setStep((s) => (Math.min(3, s + 1) as 1 | 2 | 3));
  };

  const handlePay = () => {
    if (!agree) {
      toast.error(t("form.errors.consent"));
      return;
    }
    toast.success(t("success.title"));
    setTimeout(() => navigate("/success"), 250);
  };

  return (
    <section id="checkout" className="bg-cream py-16 md:py-24">
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
          {/* Stepper */}
          <Stepper step={step} />

          {/* Step 1 - selection */}
          {step === 1 && (
            <div className="mt-8 space-y-5">
              <div>
                <Label className="text-brown-mid">{t("checkout.selected_track")}</Label>
                <Select
                  value={selection?.trackId}
                  onValueChange={(v) => handleTrackChange(v as TrackId)}
                >
                  <SelectTrigger className="mt-2 h-12 rounded-xl bg-cream-dark/60 text-brown">
                    <SelectValue placeholder={t("checkout.select_first")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TRACK_IDS.map((id) => {
                      const price = resolveTrackPrice(id, pricingData);
                      return (
                        <SelectItem key={id} value={id}>
                          {t(`${id}.title`)} — {formatPrice(price, locale)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="intent" className="text-brown-mid">
                    {t("form.intention")}
                  </Label>
                  <Input
                    id="intent"
                    placeholder={locale === "ar" ? "اختياري" : "Optional"}
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    className="mt-2 h-12 rounded-xl bg-cream-dark/60"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 - details */}
          {step === 2 && (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
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
              <div className="md:col-span-2">
                <Label className="text-brown-mid">{t("form.intention")}</Label>
                <Textarea
                  rows={2}
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  className="mt-2 rounded-xl bg-cream-dark/60"
                />
              </div>
            </div>
          )}

          {/* Step 3 - pay */}
          {step === 3 && (
            <div className="mt-8 space-y-3 rounded-2xl border border-sand/40 bg-cream-dark/40 p-5 text-sm">
              <Row k={t("checkout.selected_track")} v={trackLabel} />
              <Row k={t("form.name")} v={name} />
              <Row k={t("form.email")} v={email} />
              <Row k={t("form.quantity")} v={String(quantity)} />
              {intention && <Row k={t("form.intention")} v={intention} />}
            </div>
          )}

          {/* Total bar */}
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-green px-5 py-4 text-primary-foreground">
            <span className="text-2xl font-black">{formatPrice(total, locale)}</span>
            <span className="text-sm font-bold opacity-90">{t("checkout.total")}</span>
          </div>

          {/* Agree */}
          <label className="mt-4 flex items-start gap-2 text-xs text-brown-mid">
            <Checkbox
              checked={agree}
              onCheckedChange={(c) => setAgree(c === true)}
              className="mt-0.5"
            />
            <span>{t("checkout.agree")}</span>
          </label>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-3">
            {step === 3 ? (
              <Button
                onClick={handlePay}
                size="lg"
                className="rounded-full bg-green hover:bg-green-mid text-primary-foreground"
              >
                {t("checkout.pay_cta")}
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

          {step > 1 && (
            <button
              onClick={() => setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3))}
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

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const labels = [
    { n: "01", k: "select" },
    { n: "02", k: "info" },
    { n: "03", k: "pay" },
  ] as const;
  return (
    <div className="grid grid-cols-3 gap-2">
      {labels.map((l, i) => {
        const idx = (i + 1) as 1 | 2 | 3;
        const active = step === idx;
        return (
          <div
            key={l.k}
            className={cn(
              "rounded-2xl px-4 py-3 text-center transition-colors",
              active
                ? "bg-green text-primary-foreground"
                : "bg-cream-dark/60 text-brown-mid",
            )}
          >
            <div className={cn("text-[11px] font-bold opacity-80")}>{l.n}</div>
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

// Re-export pricing helpers locally avoided; types-only
export type { ProductRow, MatrixRow };
