import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Shield, ShieldOff } from "lucide-react";

type AUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
};

export default function Users() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users");
      if (error) throw error;
      return data.users as AUser[];
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ user_id, isAdmin }: { user_id: string; isAdmin: boolean }) => {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: isAdmin ? "revoke_admin" : "grant_admin", user_id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التحديث");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">المستخدمون</h2>
        <p className="text-sm text-muted-foreground">إدارة الحسابات وأدوار الإدارة</p>
      </div>
      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-start py-2 font-medium">البريد</th>
              <th className="text-start py-2 font-medium">الأدوار</th>
              <th className="text-start py-2 font-medium">آخر دخول</th>
              <th className="text-start py-2 font-medium">أنشئ</th>
              <th className="text-start py-2 font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => {
              const isAdm = u.roles.includes("admin");
              return (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">
                    {u.roles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      u.roles.map((r) => <Badge key={r} variant="secondary" className="mr-1">{r}</Badge>)
                    )}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("ar") : "—"}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("ar")}
                  </td>
                  <td className="py-2">
                    <Button
                      size="sm"
                      variant={isAdm ? "outline" : "default"}
                      onClick={() => toggleRole.mutate({ user_id: u.id, isAdmin: isAdm })}
                    >
                      {isAdm ? (
                        <>
                          <ShieldOff className="h-3.5 w-3.5 mr-1" /> سحب admin
                        </>
                      ) : (
                        <>
                          <Shield className="h-3.5 w-3.5 mr-1" /> منح admin
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
