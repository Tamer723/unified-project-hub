import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Payment3DSMock() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = (i18n.language?.split("-")[0] || "ar") as "ar" | "tr" | "en";
  const orderId = params.get("orderId") ?? "";
  const txn = params.get("txn") ?? "";
  const last4 = params.get("last4") ?? "····";
  const amount = Number(params.get("amount") ?? 0);
  const currency = params.get("currency") ?? "USD";

  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = useMemo(() => {
    if (locale === "ar") {
      return {
        title: "التحقق الآمن 3D Secure",
        bank: "بنك زراعات — Ziraat Bank",
        amount: "المبلغ",
        card: "البطاقة",
        otpLabel: "رمز التحقق المرسل عبر SMS",
        hint: "وضع المحاكاة — استخدم 123456 للنجاح أو 000000 لفشل البطاقة",
        confirm: "تأكيد الدفع",
        cancel: "إلغاء",
        resend: "إعادة الإرسال",
        resendIn: (s: number) => `إعادة الإرسال خلال ${s} ث`,
        encrypted: "اتصال مشفّر SSL",
      };
    }
    if (locale === "tr") {
      return {
        title: "3D Secure Doğrulama",
        bank: "Ziraat Bankası",
        amount: "Tutar",
        card: "Kart",
        otpLabel: "SMS ile gönderilen doğrulama kodu",
        hint: "Simülasyon — başarı için 123456, kart hatası için 000000",
        confirm: "Ödemeyi Onayla",
        cancel: "İptal",
        resend: "Tekrar gönder",
        resendIn: (s: number) => `${s} sn içinde tekrar gönder`,
        encrypted: "SSL şifreli bağlantı",
      };
    }
    return {
      title: "3D Secure Verification",
      bank: "Ziraat Bank",
      amount: "Amount",
      card: "Card",
      otpLabel: "Verification code sent via SMS",
      hint: "Mock mode — use 123456 for success or 000000 for card failure",
      confirm: "Confirm Payment",
      cancel: "Cancel",
      resend: "Resend",
      resendIn: (s: number) => `Resend in ${s}s`,
      encrypted: "SSL Encrypted",
    };
  }, [locale]);

  useEffect(() => {
    inputRef.current?.focus();
    if (!orderId) navigate("/failed");
  }, [orderId, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const formatAmount = (n: number | null) => {
    if (n == null) return "—";
    if (currency === "TRY") return `${n.toLocaleString("tr-TR")} ₺`;
    return `$${n.toLocaleString("en-US")}`;
  };

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      toast.error(locale === "ar" ? "أدخل 6 أرقام" : "Enter 6 digits");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ziraat-payment-verify", {
        body: { order_id: orderId, otp },
      });
      if (error) throw error;
      if (data?.approved) {
        toast.success(locale === "ar" ? "تم الدفع بنجاح" : "Payment approved");
        navigate("/success");
      } else {
        toast.error(data?.responseMessage ?? "Failed");
        navigate("/failed");
      }
    } catch (e) {
      console.error(e);
      toast.error(locale === "ar" ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-dark/60 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-sand/40 bg-card shadow-soft overflow-hidden">
        {/* Bank header */}
        <div className="bg-[#E60012] text-white p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] opacity-80">{t.title}</div>
            <div className="text-lg font-black">{t.bank}</div>
          </div>
          <ShieldCheck className="h-8 w-8" />
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-cream-dark/40 p-3">
              <div className="text-[11px] text-brown-mid">{t.amount}</div>
              <div className="font-black text-brown">{formatAmount(amount)}</div>
            </div>
            <div className="rounded-xl bg-cream-dark/40 p-3">
              <div className="text-[11px] text-brown-mid">{t.card}</div>
              <div className="font-mono font-bold text-brown">
                **** {last4}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-brown-mid">{t.otpLabel}</label>
            <Input
              ref={inputRef}
              dir="ltr"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="mt-2 h-14 rounded-xl bg-cream-dark/60 text-center text-2xl font-mono tracking-[0.5em]"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-brown-mid">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                {t.encrypted}
              </span>
              {secondsLeft > 0 ? (
                <span>{t.resendIn(secondsLeft)}</span>
              ) : (
                <button
                  onClick={() => setSecondsLeft(60)}
                  className="text-green hover:underline"
                >
                  {t.resend}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900">
            {t.hint}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/failed")}
              variant="outline"
              className="flex-1 rounded-full"
              disabled={submitting}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || otp.length !== 6}
              className="flex-1 rounded-full bg-green hover:bg-green-mid text-primary-foreground"
            >
              {submitting ? "..." : t.confirm}
            </Button>
          </div>

          {txn && (
            <p className="text-center text-[10px] text-brown-mid/70">
              TXN: {txn}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
