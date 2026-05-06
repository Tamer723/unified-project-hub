import { useOrders } from "@/hooks/useAdminStats";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { statusBadge } from "@/components/admin/ui";

export default function Audit() {
  const { data, isLoading } = useOrders();
  if (isLoading)
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  const failed = (data ?? []).filter((o) => o.status === "failed" || o.status === "expired");
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">سجل الفشل والتدقيق</h2>
        <p className="text-sm text-muted-foreground">{failed.length} عملية فاشلة/منتهية</p>
      </div>
      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-start py-2 font-medium">التاريخ</th>
              <th className="text-start py-2 font-medium">المتبرع</th>
              <th className="text-start py-2 font-medium">المبلغ</th>
              <th className="text-start py-2 font-medium">الحالة</th>
              <th className="text-start py-2 font-medium">السبب</th>
              <th className="text-start py-2 font-medium">العملية</th>
            </tr>
          </thead>
          <tbody>
            {failed.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(o.created_at).toLocaleString("ar")}
                </td>
                <td className="py-2">{o.donor_name}</td>
                <td className="py-2 font-mono">
                  {o.currency === "USD" ? `$${o.total_amount}` : `${o.total_amount} ₺`}
                </td>
                <td className="py-2"><span className={statusBadge(o.status)}>{o.status}</span></td>
                <td className="py-2 text-xs">{o.failure_reason ?? "—"}</td>
                <td className="py-2 font-mono text-xs">{o.provider_txn_id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
