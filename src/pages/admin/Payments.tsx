import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

type Provider = "mock" | "nestpay_3d" | "nestpay_hosting" | "iyzico_checkout" | "iyzico_3ds";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const CALLBACK_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/payment-callback`;

const PROVIDER_INFO: Record<Provider, { title: string; desc: string; secretsGroup: "none" | "nestpay" | "iyzico" }> = {
  mock: {
    title: "بوابة وهمية (محاكاة)",
    desc: "للاختبار الداخلي. لا تتصل بأي بنك. استخدم رمز 123456 للنجاح.",
    secretsGroup: "none",
  },
  nestpay_3d: {
    title: "NestPay 3D Model (زراعات)",
    desc: "النموذج يُعرَض في موقعك، البنك يتحقق من 3DS فقط (OTP).",
    secretsGroup: "nestpay",
  },
  nestpay_hosting: {
    title: "NestPay 3D Pay Hosting (زراعات)",
    desc: "البنك يستضيف صفحة الدفع بالكامل (الأبسط، PCI-DSS SAQ-A).",
    secretsGroup: "nestpay",
  },
  iyzico_checkout: {
    title: "iyzico Checkout Form",
    desc: "iyzico تستضيف صفحة الدفع بالكامل (الأبسط، يدعم Sandbox للاختبار).",
    secretsGroup: "iyzico",
  },
  iyzico_3ds: {
    title: "iyzico Payment with 3DS",
    desc: "نموذج البطاقة في موقعك، iyzico تتحقق من 3DS عبر iframe.",
    secretsGroup: "iyzico",
  },
};

type SecretStatus = {
  nestpay_client_id: boolean;
  nestpay_store_key: boolean;
  iyzico_api_key: boolean;
  iyzico_secret_key: boolean;
};

const GROUP_SECRETS: Record<"none" | "nestpay" | "iyzico", string[]> = {
  none: [],
  nestpay: ["NESTPAY_CLIENT_ID", "NESTPAY_STORE_KEY"],
  iyzico: ["IYZICO_API_KEY", "IYZICO_SECRET_KEY"],
};

function getMissing(group: "none" | "nestpay" | "iyzico", s: SecretStatus | null): string[] {
  if (!s || group === "none") return [];
  if (group === "nestpay") {
    return [!s.nestpay_client_id && "NESTPAY_CLIENT_ID", !s.nestpay_store_key && "NESTPAY_STORE_KEY"].filter(Boolean) as string[];
  }
  return [!s.iyzico_api_key && "IYZICO_API_KEY", !s.iyzico_secret_key && "IYZICO_SECRET_KEY"].filter(Boolean) as string[];
}

export default function Payments() {
  const [provider, setProvider] = useState<Provider>("mock");
  const [testMode, setTestMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secrets, setSecrets] = useState<SecretStatus | null>(null);
  const [checkingSecrets, setCheckingSecrets] = useState(false);

  const checkSecrets = useCallback(async () => {
    setCheckingSecrets(true);
    const { data, error } = await supabase.functions.invoke("payment-config-check");
    setCheckingSecrets(false);
    if (error) {
      toast.error("تعذّر فحص الأسرار: " + error.message);
      return;
    }
    setSecrets(data as SecretStatus);
  }, []);

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
      await checkSecrets();
      setLoading(false);
    })();
  }, [checkSecrets]);

  const currentGroup = PROVIDER_INFO[provider].secretsGroup;
  const missingList = getMissing(currentGroup, secrets);
  const secretsOk = currentGroup === "none" ? true : (secrets ? missingList.length === 0 : false);
  const blockedSave = currentGroup !== "none" && !secretsOk;

  const save = async () => {
    if (blockedSave) {
      toast.error("لا يمكن الحفظ: أسرار البوابة ناقصة");
      return;
    }
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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">إعدادات الدفع</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تحكَّم في بوابة الدفع المستخدمة وبيئة التشغيل (تجريبية / إنتاج).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={checkSecrets} disabled={checkingSecrets}>
          {checkingSecrets ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <RefreshCw className="h-4 w-4 me-2" />}
          إعادة فحص الأسرار
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بوابة الدفع النشطة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={provider} onValueChange={(v) => setProvider(v as Provider)} className="space-y-3">
            {(Object.keys(PROVIDER_INFO) as Provider[]).map((key) => {
              const pInfo = PROVIDER_INFO[key];
              const itemMissing = getMissing(pInfo.secretsGroup, secrets);
              const itemOk = pInfo.secretsGroup === "none" || (secrets && itemMissing.length === 0);
              return (
                <label
                  key={key}
                  htmlFor={key}
                  className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors"
                >
                  <RadioGroupItem value={key} id={key} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{pInfo.title}</span>
                      {pInfo.secretsGroup !== "none" && secrets && (
                        itemOk ? (
                          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
                            <CheckCircle2 className="h-3 w-3 me-1" /> الأسرار مهيّأة
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 me-1" /> أسرار ناقصة
                          </Badge>
                        )
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{pInfo.desc}</div>
                    {pInfo.secretsGroup !== "none" && secrets && !itemOk && (
                      <div className="text-xs text-destructive mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> الناقص: {itemMissing.join("، ")}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {currentGroup !== "none" && (
        <Card>
          <CardHeader>
            <CardTitle>إعدادات {currentGroup === "nestpay" ? "NestPay" : "iyzico"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!secretsOk && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>لا يمكن تفعيل هذه البوابة</AlertTitle>
                <AlertDescription className="mt-2 text-sm">
                  الأسرار التالية مفقودة: <strong>{missingList.join("، ")}</strong>.
                  أضِفها من إعدادات Lovable Cloud (Backend → Secrets) ثم اضغط "إعادة فحص الأسرار".
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">وضع الاختبار (Test / Sandbox)</Label>
                <p className="text-sm text-muted-foreground">
                  {currentGroup === "iyzico"
                    ? (testMode ? "sandbox-api.iyzipay.com" : "api.iyzipay.com (إنتاج)")
                    : (testMode ? "entegrasyon.asseco-see.com.tr" : "sanalposprov.ziraatbank.com.tr")}
                </p>
              </div>
              <Switch checked={testMode} onCheckedChange={setTestMode} />
            </div>

            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>الأسرار المطلوبة</AlertTitle>
              <AlertDescription className="space-y-1 mt-2 text-sm">
                {GROUP_SECRETS[currentGroup].map((s) => (
                  <div key={s}><code className="bg-muted px-1 rounded">{s}</code></div>
                ))}
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 space-y-2">
              <Label>عنوان الـ Callback (سجِّله لدى البوابة)</Label>
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

      <div className="flex justify-end items-center gap-3 sticky bottom-0 bg-background/80 backdrop-blur py-3">
        {blockedSave && (
          <span className="text-xs text-destructive">الحفظ معطّل: أضِف الأسرار الناقصة أولاً</span>
        )}
        <Button onClick={save} disabled={saving || blockedSave}>
          {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
}
