import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Copy, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type Provider = "mock" | "nestpay_3d" | "nestpay_hosting";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const CALLBACK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/payment-callback`;

const PROVIDER_INFO: Record<Provider, { title: string; desc: string; needsSecrets: boolean }> = {
  mock: {
    title: "بوابة وهمية (محاكاة)",
    desc: "للاختبار الداخلي. لا تتصل بأي بنك. استخدم رمز 123456 للنجاح.",
    needsSecrets: false,
  },
  nestpay_3d: {
    title: "NestPay 3D Model",
    desc: "النموذج يُعرَض في موقعك، البنك يتحقق من 3DS فقط (OTP). يتطلب التزاماً أعلى بـ PCI-DSS.",
    needsSecrets: true,
  },
  nestpay_hosting: {
    title: "NestPay 3D Pay Hosting",
    desc: "البنك يستضيف صفحة الدفع بالكامل (الأبسط والأكثر أماناً، PCI-DSS SAQ-A).",
    needsSecrets: true,
  },
};

export default function Payments() {
  const [provider, setProvider] = useState<Provider>("mock");
  const [testMode, setTestMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("active_provider, test_mode")
        .limit(1)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setProvider(data.active_provider as Provider);
        setTestMode(data.test_mode);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("payment_settings")
      .update({
        active_provider: provider,
        test_mode: testMode,
        updated_at: new Date().toISOString(),
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("تم حفظ إعدادات الدفع");
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("تم النسخ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const info = PROVIDER_INFO[provider];

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الدفع</h1>
        <p className="text-sm text-muted-foreground mt-1">
          تحكَّم في بوابة الدفع المستخدمة وبيئة التشغيل (تجريبية / إنتاج).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بوابة الدفع النشطة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={provider} onValueChange={(v) => setProvider(v as Provider)} className="space-y-3">
            {(Object.keys(PROVIDER_INFO) as Provider[]).map((key) => (
              <label
                key={key}
                htmlFor={key}
                className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors"
              >
                <RadioGroupItem value={key} id={key} className="mt-1" />
                <div className="flex-1">
                  <div className="font-bold">{PROVIDER_INFO[key].title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{PROVIDER_INFO[key].desc}</div>
                  {PROVIDER_INFO[key].needsSecrets && (
                    <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> يتطلب أسرار: NESTPAY_CLIENT_ID, NESTPAY_STORE_KEY
                    </div>
                  )}
                </div>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {info.needsSecrets && (
        <Card>
          <CardHeader>
            <CardTitle>بيئة NestPay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">وضع الاختبار (Test)</Label>
                <p className="text-sm text-muted-foreground">
                  {testMode
                    ? "يستخدم بيئة entegrasyon.asseco-see.com.tr (لا توجد عمليات حقيقية)"
                    : "يستخدم بيئة الإنتاج sanalposprov.ziraatbank.com.tr"}
                </p>
              </div>
              <Switch checked={testMode} onCheckedChange={setTestMode} />
            </div>

            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>الأسرار المطلوبة</AlertTitle>
              <AlertDescription className="space-y-1 mt-2 text-sm">
                <div><code className="bg-muted px-1 rounded">NESTPAY_CLIENT_ID</code> — رقم التاجر من بنك زراعات</div>
                <div><code className="bg-muted px-1 rounded">NESTPAY_STORE_KEY</code> — مفتاح التوقيع (Hash V3)</div>
                <div><code className="bg-muted px-1 rounded">NESTPAY_HOST_URL_TEST</code> — اختياري (افتراضي: entegrasyon.asseco-see.com.tr)</div>
                <div><code className="bg-muted px-1 rounded">NESTPAY_HOST_URL_PROD</code> — اختياري (افتراضي: sanalposprov.ziraatbank.com.tr)</div>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 space-y-2">
              <Label>عنوان الـ Callback (سجِّله لدى البنك كـ okUrl و failUrl)</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted p-2 rounded text-xs break-all" dir="ltr">{CALLBACK_URL}</code>
                <Button size="sm" variant="outline" onClick={() => copy(CALLBACK_URL)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 sticky bottom-0 bg-background/80 backdrop-blur py-3">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
}
