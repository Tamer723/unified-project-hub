import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, Send, User as UserIcon } from "lucide-react";

export default function Account() {
  const { user, roles } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [testingTg, setTestingTg] = useState(false);

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("8 أحرف على الأقل");
    if (pw !== pw2) return toast.error("كلمتا المرور غير متطابقتين");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث كلمة المرور");
    setPw("");
    setPw2("");
  };

  const testTelegram = async () => {
    setTestingTg(true);
    const { data, error } = await supabase.functions.invoke("notify-telegram", {
      body: { test: true },
    });
    setTestingTg(false);
    if (error || data?.error) return toast.error(error?.message || data?.error || "فشل الإرسال");
    toast.success("تم إرسال رسالة تجريبية");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">حسابي</h2>
        <p className="text-sm text-muted-foreground">إدارة بيانات حسابك والإشعارات</p>
      </div>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">معلومات الحساب</h3>
        </div>
        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">البريد:</span> {user?.email}</div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">الأدوار:</span>
            {roles.length === 0 ? <span className="text-muted-foreground">—</span> : roles.map((r) => (
              <Badge key={r} variant="secondary">{r}</Badge>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">تغيير كلمة المرور</h3>
        </div>
        <form onSubmit={updatePassword} className="space-y-3">
          <div>
            <Label htmlFor="np">كلمة المرور الجديدة</Label>
            <Input id="np" type="password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="cp">تأكيد كلمة المرور</Label>
            <Input id="cp" type="password" minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
          <Button type="submit" disabled={savingPw}>
            {savingPw ? "..." : "تحديث"}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Send className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">إشعارات تلغرام</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          يتم إرسال إشعار إلى محادثة الأدمن المُعدّة عند كل عملية دفع (نجاح أو فشل).
          تأكد من ضبط <code className="text-xs bg-muted px-1 py-0.5 rounded">TELEGRAM_ADMIN_CHAT_ID</code> في الأسرار.
        </p>
        <Button onClick={testTelegram} disabled={testingTg} variant="outline">
          {testingTg ? "..." : "إرسال رسالة تجريبية"}
        </Button>
      </Card>
    </div>
  );
}
