import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ANIMAL_PRICES,
  COUNTRY_CODES,
  TRACK_PRICES,
  formatPrice,
  type AnimalCode,
  type CountryCode,
} from "@/lib/pricing";
import type { Locale } from "@/lib/constants";
import type { TrackId } from "./Tracks";

type Props = {
  open: boolean;
  trackId: TrackId | null;
  onOpenChange: (o: boolean) => void;
};

export function OrderForm({ open, trackId, onOpenChange }: Props) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language?.split("-")[0] || "ar") as Locale;
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [country, setCountry] = useState<CountryCode>("SY");
  const [animal, setAnimal] = useState<AnimalCode>("sheep");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [intention, setIntention] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setStep(1);
      setErrors({});
    }
  }, [open, trackId]);

  const unitPriceUsd = useMemo(() => {
    if (trackId === "track1") return TRACK_PRICES.track1;
    if (trackId === "track2") return TRACK_PRICES.track2;
    return ANIMAL_PRICES[animal];
  }, [trackId, animal]);

  const totalUsd = unitPriceUsd * quantity;

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = t("form.errors.name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t("form.errors.email");
    if (!consent) e.consent = t("form.errors.consent");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const handlePay = () => {
    toast({ title: "✓", description: t("success.title") });
    onOpenChange(false);
    setTimeout(() => navigate("/success"), 200);
  };

  if (!trackId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-cream border-sand/40">
        <DialogHeader>
          <DialogTitle className="text-brown">{t("form.title")}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-2 text-xs">
          {(["select", "info", "pay"] as const).map((k, i) => {
            const idx = i + 1;
            const active = step >= idx;
            return (
              <div key={k} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full font-bold",
                    active ? "bg-green text-primary-foreground" : "bg-cream-dark text-brown-mid",
                  )}
                >
                  {idx}
                </div>
                <span className={cn("text-xs", active ? "text-brown" : "text-brown-mid")}>
                  {t(`form.steps.${k}`)}
                </span>
                {i < 2 && <div className="h-px flex-1 bg-sand/40" />}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-pale px-4 py-3">
              <div className="text-xs text-brown-mid">{t("form.track")}</div>
              <div className="font-semibold text-brown">{t(`${trackId}.title`)}</div>
            </div>

            {trackId === "track3" && (
              <>
                <div className="space-y-2">
                  <Label>{t("track3.country_label")}</Label>
                  <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`track3.countries.${c}`)} — {formatPrice(ANIMAL_PRICES[animal], locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("track3.animal_label")}</Label>
                  <Select value={animal} onValueChange={(v) => setAnimal(v as AnimalCode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ANIMAL_PRICES) as AnimalCode[]).map((a) => (
                        <SelectItem key={a} value={a}>
                          {t(`track3.animals.${a}`)} — {formatPrice(ANIMAL_PRICES[a], locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="qty">{t("form.quantity")}</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-brown text-primary-foreground px-4 py-3">
              <span className="text-sm opacity-80">{t("form.total")}</span>
              <span className="text-xl font-bold">{formatPrice(totalUsd, locale)}</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("form.name")} *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("form.email")} *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("form.phone")}</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intention">{t("form.intention")}</Label>
              <Textarea id="intention" rows={2} value={intention} onChange={(e) => setIntention(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-sand/40 bg-card p-3 text-sm">
              <Checkbox checked={consent} onCheckedChange={(c) => setConsent(c === true)} className="mt-0.5" />
              <span className="text-brown-mid">{t("form.consent")} *</span>
            </label>
            {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-sand/40 bg-card p-4">
              <div className="font-semibold text-brown">{t("form.summary")}</div>
              <div className="mt-3 space-y-1.5 text-sm">
                <Row k={t("form.track")} v={t(`${trackId}.title`)} />
                {trackId === "track3" && (
                  <>
                    <Row k={t("track3.country_label")} v={t(`track3.countries.${country}`)} />
                    <Row k={t("track3.animal_label")} v={t(`track3.animals.${animal}`)} />
                  </>
                )}
                <Row k={t("form.quantity")} v={String(quantity)} />
                <Row k={t("form.unit_price")} v={formatPrice(unitPriceUsd, locale)} />
                <div className="my-2 h-px bg-sand/40" />
                <Row k={t("form.total")} v={formatPrice(totalUsd, locale)} bold />
              </div>
            </div>
            <Button
              onClick={handlePay}
              size="lg"
              className="w-full bg-green hover:bg-green-mid text-primary-foreground rounded-full"
            >
              <Lock className="h-4 w-4" />
              {t("form.continue_pay")}
            </Button>
            <div className="flex items-center justify-center gap-3 text-xs text-brown-mid">
              <Lock className="h-3 w-3" /> {t("form.secure")}
              <span className="rounded bg-brown px-2 py-0.5 font-bold text-primary-foreground">VISA</span>
              <span className="rounded bg-sand px-2 py-0.5 font-bold text-brown">MC</span>
            </div>
          </div>
        )}

        <div className="mt-2 flex justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="rounded-full"
          >
            {t("form.back")}
          </Button>
          {step < 3 && (
            <Button
              type="button"
              onClick={handleNext}
              className="bg-green hover:bg-green-mid text-primary-foreground rounded-full"
            >
              {t("form.next")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", bold && "text-base font-bold text-brown")}>
      <span className="text-brown-mid">{k}</span>
      <span className="text-end">{v}</span>
    </div>
  );
}
