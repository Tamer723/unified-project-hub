import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, UserPlus, KeyRound } from "lucide-react";

type AUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
};

const ALL_ROLES = ["admin", "moderator", "viewer"] as const;
type Role = typeof ALL_ROLES[number];

const ROLE_LABEL: Record<Role, string> = {
  admin: "مسؤول",
  moderator: "محرّر",
  viewer: "مشاهد",
};
const ROLE_COLOR: Record<Role, string> = {
  admin: "bg-red-100 text-red-800 hover:bg-red-100",
  moderator: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  viewer: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export default function Users() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [pwUser, setPwUser] = useState<AUser | null>(null);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", { body: {} });
      if (error) throw error;
      return (data?.users ?? []) as AUser[];
    },
  });

  const mutate = useMutation({
    mutationFn: async (body: any) => {
      const { data, error } = await supabase.functions.invoke("admin-users", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("تم التحديث");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutate.mutateAsync({
      action: "invite_user",
      email: inviteEmail,
      role: inviteRole,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setInviteOpen(false);
    setInviteEmail("");
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) return toast.error("8 أحرف على الأقل");
    if (newPw !== newPw2) return toast.error("كلمتا المرور غير متطابقتين");
    if (!pwUser) return;
    await mutate.mutateAsync({ action: "set_password", user_id: pwUser.id, password: newPw });
    setPwUser(null);
    setNewPw("");
    setNewPw2("");
  };

  if (isLoading)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">المستخدمون</h2>
          <p className="text-sm text-muted-foreground">إدارة الحسابات والصلاحيات</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-1" /> دعوة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>دعوة مستخدم جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <Label htmlFor="iv-email">البريد</Label>
                <Input
                  id="iv-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>الدور</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                سيُرسَل بريد دعوة يطلب منهم تعيين كلمة المرور.
              </p>
              <Button type="submit" className="w-full" disabled={mutate.isPending}>
                {mutate.isPending ? "..." : "إرسال الدعوة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-start py-2 font-medium">البريد</th>
              <th className="text-start py-2 font-medium">الأدوار</th>
              <th className="text-start py-2 font-medium">آخر دخول</th>
              <th className="text-start py-2 font-medium">أنشئ</th>
              <th className="text-start py-2 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2">{u.email}</td>
                <td className="py-2">
                  {u.roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} className={ROLE_COLOR[r as Role] ?? ""}>{ROLE_LABEL[r as Role] ?? r}</Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("ar") : "—"}
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("ar")}
                </td>
                <td className="py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>إضافة دور</DropdownMenuLabel>
                      {ALL_ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                        <DropdownMenuItem
                          key={`add-${r}`}
                          onClick={() => mutate.mutate({ action: "grant_role", user_id: u.id, role: r })}
                        >
                          منح: {ROLE_LABEL[r]}
                        </DropdownMenuItem>
                      ))}
                      {u.roles.length > 0 && <DropdownMenuSeparator />}
                      {u.roles.length > 0 && <DropdownMenuLabel>إزالة دور</DropdownMenuLabel>}
                      {u.roles.map((r) => (
                        <DropdownMenuItem
                          key={`rm-${r}`}
                          onClick={() => mutate.mutate({ action: "revoke_role", user_id: u.id, role: r })}
                        >
                          سحب: {ROLE_LABEL[r as Role] ?? r}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setPwUser(u)}>
                        <KeyRound className="h-4 w-4 mr-2" /> تعيين كلمة مرور
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعيين كلمة مرور — {pwUser?.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <Label htmlFor="np1">كلمة المرور الجديدة</Label>
              <Input id="np1" type="password" minLength={8} value={newPw}
                onChange={(e) => setNewPw(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="np2">تأكيد</Label>
              <Input id="np2" type="password" minLength={8} value={newPw2}
                onChange={(e) => setNewPw2(e.target.value)} required />
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم تغيير كلمة مرور المستخدم فوراً. أبلغه بها عبر قناة آمنة.
            </p>
            <Button type="submit" className="w-full" disabled={mutate.isPending}>
              {mutate.isPending ? "..." : "تحديث كلمة المرور"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
